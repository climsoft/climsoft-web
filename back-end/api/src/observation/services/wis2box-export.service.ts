import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import path from 'node:path';
import { Wis2BoxExportParametersDto } from 'src/metadata/export-specifications/dtos/wis2box-export-parameters.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { PRESSURE_TENDENCY_FM12_MACRO_SQL, WMO_STATION_TYPE_MACRO_SQL } from './wis2box-export-macros';

@Injectable()
export class Wis2BoxExportService implements OnModuleInit {
    private readonly logger = new Logger(Wis2BoxExportService.name);

    /**
     * Per-element value transforms applied inside pivot expressions. Wrapped in
     * ROUND to suppress float-arithmetic noise — e.g. `273.15` is not exactly
     * representable in float64, so `value + 273.15` would otherwise produce
     * trailing-digit noise. Shared between SYNOP and DAYCLI generators.
     */
    private readonly hPaToPa = (v: string) => `ROUND(${v} * 100, 1)`;  // Pa to 0.1 precision
    private readonly celciusToK = (v: string) => `ROUND(${v} + 273.15, 2)`;  // K to 0.01 precision
    private readonly knotsToMs = (v: string) => `ROUND(${v} * 0.51444, 2)`;  // ms to 0.01 precision
    private readonly feetToMeters = (v: string) => `ROUND(${v} * 0.3048, 2)`;  // meters to 0.01 precision 
    private readonly oktasToPerc = (v: string) => `ROUND( (${v} * 100) / 8 , 0)`;  // % with no d.p. Important for 9 oktas to be 113% 
    private readonly minsToHours = (v: string) => `ROUND(${v} / 60, 2)`;  // ms to 0.01 precision 

    constructor(
        private fileIOService: FileIOService,
    ) {
    }

    /**
     * Registers DuckDB SQL macros required by the WIS2BOX generators. Macros
     * are connection-scoped, so they need to be created once per DuckDB
     * connection (which `FileIOService` initialises in its own onModuleInit).
     * NestJS resolves provider init in dependency order, so by the time this
     * runs the DuckDB connection is ready.
     *
     * Add new macros to this method as additional encodings are introduced
     * (e.g. cloud encoding, present-weather code translation). Once the count
     * grows past ~3, consider promoting the macro bodies to .sql files under
     * a `duckdb-scripts/` folder with a dedicated loader service.
     */
    public async onModuleInit(): Promise<void> {
        await this.fileIOService.duckDbConn.run(PRESSURE_TENDENCY_FM12_MACRO_SQL);
        await this.fileIOService.duckDbConn.run(WMO_STATION_TYPE_MACRO_SQL);
        this.logger.log('DuckDB macros registered: pressure_tendency_fm12, wmo_station_type');
    }

    /**
     * Reads the raw observations CSV from inputFilePathName, pivots it into
     * the WIS2BOX-shaped SYNOP CSV (one row per (station, hourly slot)) and
     * writes the result to outputDir.
     *
     * Multi-stage SQL:
     *   1. CTE `pivoted` — group input rows by (station, observation moment)
     *      and pivot each user-mapped element into its own column.
     *      Per-element transforms applied here:
     *        - Pressure columns: hPa -> Pa (* 100), rounded to 1 decimal
     *        - Temperature columns: C -> K (+ 273.15), rounded to 2 decimals
     *      Rounding suppresses float-arithmetic noise.
     *   2. CTE `station_meta` — collapses pivoted to one row per station and
     *      computes the time bounds for each station's data.
     *   3. CTE `hourly_grid` — generates a complete hourly timeline per
     *      station from min(observation_dt) to max(observation_dt) using
     *      generate_series. Guarantees row-based LAG/ROWS windows in the
     *      outer SELECT see contiguous hourly rows even when the input has
     *      gaps (missing observation hours).
     *   4. CTE `filled` — LEFT JOIN hourly_grid onto pivoted, NULL-filling
     *      measurement columns for hours with no data.
     *   5. Outer SELECT — emits the WIS2BOX spec column order, including
     *      windowed aggregates that depend on neighbouring rows:
     *        - pressure_change_{3,24}hr: LAG-based difference
     *        - pressure_tendency_characteristic: SYNOP FM-12 code via
     *          pressure_tendency_fm12() macro (registered in onModuleInit)
     *        - sunshine_total_24hr, total_precipitation_{3,6,12,24}_hour,
     *          solar_radiation24_*: strict SUM over rolling row windows
     *          (NULL when fewer than N values are present in the window)
     *
     * Several columns are emitted as hardcoded constants or NULL (per TODOs
     * in WIS2BOX_ELEMENTS_BY_REPORT_TYPE[SYNOP]) until station instrument
     * metadata becomes available.
     */
    public async generateSynopFiles(exportParams: Wis2BoxExportParametersDto, outputDir: string, inputFilePathName: string): Promise<void> {
        const mappingByElement = new Map<string, number>(
            exportParams.elementMappings.map(m => [m.wis2BoxElement, m.databaseElementId])
        );

        // CTE pivot: emits MAX(CASE...) for a user-mapped element, or NULL when unmapped.
        // Casts to DOUBLE by default so that downstream window aggregates (SUM/LAG)
        // operate on numeric values rather than the raw varchar from `read_csv`.
        const pivot = (name: string, transform?: (sql: string) => string): string => {
            const elementId = mappingByElement.get(name);
            if (elementId === undefined) {
                return `NULL AS ${name}`;
            }
            const valueExpr = transform ? transform('value::DOUBLE') : 'value::DOUBLE';
            return `MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN ${valueExpr} END) AS ${name}`;
        };

        // Strict windowed sum: returns NULL if fewer than `n` non-null values are present
        // in the window. Encodes the WMO requirement that a multi-hour aggregate is
        // missing when any of its constituent hours is missing. Result rounded to 2
        // decimals to suppress float noise on summed fractional values.
        const strictWindowSum = (col: string, n: number, w: string): string =>
            `CASE WHEN COUNT(${col}) OVER ${w} = ${n} THEN ROUND(SUM(${col}) OVER ${w}, 2) ELSE NULL END`;

        // ── CTE: pivoted measurements + identifier carriers ──────────────
        const cteColumns: string[] = [
            'station_id',
            'station_name',
            'wigos_id',
            'wmo_id',
            'station_latitude',
            'station_longitude',
            'station_elevation',
            'station_obs_processing_method',
            'date_time::TIMESTAMP AS observation_dt',
            // Pressure (hPa -> Pa)
            pivot('station_pressure', this.hPaToPa),
            pivot('msl_pressure', this.hPaToPa),
            // comes from observation for now but later it can be derived
            pivot('geopotential_height'),
            // Air temperature (C -> K)
            pivot('air_temperature', this.celciusToK),
            pivot('dewpoint_temperature', this.celciusToK),
            pivot('relative_humidity'),
            pivot('horizontal_visibility'),
            // Cloud
            pivot('cloud_total_cover', this.oktasToPerc),
            pivot('cloud_total_vertical_sig'),
            pivot('cloud_amount_low_level'),
            pivot('cloud_base_height', this.feetToMeters),
            pivot('cloud_type_low_level'),
            pivot('cloud_type_mid_level'),
            pivot('cloud_type_high_level'),
            pivot('cloud_layer1_vertical_sig'),
            pivot('cloud_layer1_amount'),
            pivot('cloud_layer1_type'),
            pivot('cloud_layer1_base_height', this.feetToMeters),
            pivot('cloud_layer2_vertical_sig'),
            pivot('cloud_layer2_amount'),
            pivot('cloud_layer2_type'),
            pivot('cloud_layer2_base_height', this.feetToMeters),
            pivot('cloud_layer3_vertical_sig'),
            pivot('cloud_layer3_amount'),
            pivot('cloud_layer3_type'),
            pivot('cloud_layer3_base_height', this.feetToMeters),
            pivot('cloud_layer4_vertical_sig'),
            pivot('cloud_layer4_amount'),
            pivot('cloud_layer4_type'),
            pivot('cloud_layer4_base_height', this.feetToMeters),
            // Soil temperatures (C -> K)
            pivot('soil_level1_temperature', this.celciusToK),
            pivot('soil_level2_temperature', this.celciusToK),
            pivot('soil_level3_temperature', this.celciusToK),
            pivot('soil_level4_temperature', this.celciusToK),
            pivot('soil_level5_temperature', this.celciusToK),
            pivot('soil_level6_temperature', this.celciusToK),
            pivot('soil_level7_temperature', this.celciusToK),
            pivot('soil_level8_temperature', this.celciusToK),
            pivot('soil_level9_temperature', this.celciusToK),
            pivot('soil_level10_temperature', this.celciusToK),
            // Ground / snow / weather
            pivot('ground_state'),
            pivot('snow_depth'),
            pivot('ground_minimum_temperature', this.celciusToK),
            pivot('present_weather'),
            pivot('past_weather1'),
            pivot('past_weather2'),
            pivot('sunshine_total_1hr'),
            pivot('total_precipitation_1_hour'),
            // Extreme temperatures (C -> K)
            pivot('temp_maximum', this.celciusToK),
            pivot('temp_minimum', this.celciusToK),
            // Wind
            pivot('wind_direction'),
            pivot('wind_speed', this.knotsToMs),
            pivot('max_wind_gust_direction_10min', this.knotsToMs),
            pivot('maximum_wind_gust_speed_10min', this.knotsToMs),
            pivot('max_wind_gust_direction_60min', this.knotsToMs),
            pivot('maximum_wind_gust_speed_60min', this.knotsToMs),
            // Evaporation
            pivot('evaporation_total'),
            // Solar radiation (1-hour)
            pivot('solar_radiation1_long_wave'),
            pivot('solar_radiation1_short_wave'),
            pivot('solar_radiation1_net'),
            pivot('solar_radiation1_global'),
            pivot('solar_radiation1_diffuse'),
            pivot('solar_radiation1_direct'),
        ];

        // ── Outer SELECT: spec column order ──────────────────────────────
        const columns: string[] = [
            // ── Identifiers ────────────────────────────────────────────────
            // WSI parsed from wigos_id (format: series-issuer-issue_number-local)
            `COALESCE(TRY_CAST(split_part(wigos_id, '-', 1) AS INTEGER), 0) AS wsi_series`,
            `COALESCE(TRY_CAST(split_part(wigos_id, '-', 2) AS INTEGER), 0) AS wsi_issuer`,
            `COALESCE(TRY_CAST(split_part(wigos_id, '-', 3) AS INTEGER), 0) AS wsi_issue_number`,
            `COALESCE(NULLIF(split_part(wigos_id, '-', 4), ''), station_id) AS wsi_local`,
            // WMO parsed from wmo_id (format: BBBSS - 5 digits)
            `COALESCE(TRY_CAST(SUBSTRING(wmo_id, 1, 3) AS INTEGER), 0) AS wmo_block_number`,
            `COALESCE(TRY_CAST(SUBSTRING(wmo_id, 4, 2) AS INTEGER), 0) AS wmo_station_number`,
            `station_name AS station_name`,
            // station_type derived from station.observation_processing_method
            // via the wmo_station_type macro (registered in onModuleInit).
            `wmo_station_type(station_obs_processing_method) AS station_type`,
            // ── Date components ───────────────────────────────────────────
            `EXTRACT(YEAR FROM observation_dt)::INTEGER AS year`,
            `EXTRACT(MONTH FROM observation_dt)::INTEGER AS month`,
            `EXTRACT(DAY FROM observation_dt)::INTEGER AS day`,
            `EXTRACT(HOUR FROM observation_dt)::INTEGER AS hour`,
            `EXTRACT(MINUTE FROM observation_dt)::INTEGER AS minute`,
            // ── Location ──────────────────────────────────────────────────
            `station_latitude AS latitude`,
            `station_longitude AS longitude`,
            `station_elevation AS station_height_above_msl`,
            // TODO: barometer_height_above_msl — to come from station instrument metadata. Add to upstream SELECT when available.
            `NULL AS barometer_height_above_msl`,
            // ── Pressure ──────────────────────────────────────────────────
            `station_pressure`,
            `msl_pressure`,
            // pressure_change_3hr — current minus 3h prior (NULL if either missing).
            // Rounded to 1 decimal to match the Pa precision used in the pressure transforms.
            `ROUND(station_pressure - LAG(station_pressure, 3) OVER w, 1) AS pressure_change_3hr`,
            // pressure_tendency_characteristic — SYNOP FM-12 code 0-8, via DuckDB SQL macro
            `pressure_tendency_fm12(
                station_pressure,
                LAG(station_pressure, 1) OVER w,
                LAG(station_pressure, 2) OVER w,
                LAG(station_pressure, 3) OVER w
            ) AS pressure_tendency_characteristic`,
            // pressure_change_24hr — current minus 24h prior (NULL if either missing)
            `ROUND(station_pressure - LAG(station_pressure, 24) OVER w, 1) AS pressure_change_24hr`,
            `85000 AS pressure_standard_level`,
            // TODO: geopotential_height — comes from observation for now but later it can be derived
            `geopotential_height`,
            // TODO: thermometer_height — should come from station instrument metadata.  Add to upstream SELECT when available.
            `NULL AS thermometer_height`,
            // ── Air temperature ──────────────────────────────────────────
            `air_temperature`,
            `dewpoint_temperature`,
            `relative_humidity`,
            // TODO: visibility_sensor_height — to come from station instrument metadata.
            `NULL AS visibility_sensor_height`,
            `horizontal_visibility`,
            // ── Cloud ─────────────────────────────────────────────────────
            `cloud_total_cover`,
            `cloud_total_vertical_sig`,
            `cloud_amount_low_level`,
            `cloud_base_height`,
            `cloud_type_low_level`,
            `cloud_type_mid_level`,
            `cloud_type_high_level`,
            `cloud_layer1_vertical_sig`,
            `cloud_layer1_amount`,
            `cloud_layer1_type`,
            `cloud_layer1_base_height`,
            `cloud_layer2_vertical_sig`,
            `cloud_layer2_amount`,
            `cloud_layer2_type`,
            `cloud_layer2_base_height`,
            `cloud_layer3_vertical_sig`,
            `cloud_layer3_amount`,
            `cloud_layer3_type`,
            `cloud_layer3_base_height`,
            `cloud_layer4_vertical_sig`,
            `cloud_layer4_amount`,
            `cloud_layer4_type`,
            `cloud_layer4_base_height`,
            // ── Soil (depths will come from station element instrument metadata. Temperatures already converted in CTE) ──
            `NULL AS soil_level1_depth`, // TODO. To come from station instrument metadata.
            `soil_level1_temperature`,
            `NULL AS soil_level2_depth`, // TODO. To come from station instrument metadata.
            `soil_level2_temperature`,
            `NULL AS soil_level3_depth`, // TODO. To come from station instrument metadata.
            `soil_level3_temperature`,
            `NULL AS soil_level4_depth`, // TODO. To come from station instrument metadata.
            `soil_level4_temperature`,
            `NULL AS soil_level5_depth`, // TODO. To come from station instrument metadata.
            `soil_level5_temperature`,
            `NULL AS soil_level6_depth`, // TODO. To come from station instrument metadata.
            `soil_level6_temperature`,
            `NULL AS soil_level7_depth`, // TODO. To come from station instrument metadata.
            `soil_level7_temperature`,
            `NULL AS soil_level8_depth`, // TODO. To come from station instrument metadata.
            `soil_level8_temperature`,
            `NULL AS soil_level9_depth`, // TODO. To come from station instrument metadata.
            `soil_level9_temperature`,
            `NULL AS soil_level10_depth`, // TODO. To come from station instrument metadata.
            `soil_level10_temperature`,
            // ── Ground / snow ─────────────────────────────────────────────
            // TODO: method_of_ground_state_measurement — to come from station instrument metadata.
            `NULL AS method_of_ground_state_measurement`,
            `ground_state`,
            // TODO: method_of_snow_depth_measurement — to come from station instrument metadata.
            `NULL AS method_of_snow_depth_measurement`,
            `snow_depth`,
            `ground_minimum_temperature`,
            // ── Weather / sunshine ────────────────────────────────────────
            `present_weather`,
            // TODO: past_weather_period — placeholder per TODO in SYNOP elements list.
            `-1 AS past_weather_period`,
            `past_weather1`,
            `past_weather2`,
            `sunshine_total_1hr`,
            // sunshine_total_24hr — strict 24-row trailing sum (NULL if any hour missing). Convert minutes to hours.
            `${this.minsToHours(strictWindowSum('sunshine_total_1hr', 24, 'w_24'))} AS sunshine_total_24hr`,
            // ── Precipitation ─────────────────────────────────────────────
            // TODO: rain_sensor_height — to come from station instrument metadata.
            `NULL AS rain_sensor_height`,
            `total_precipitation_1_hour`,
            // total_precipitation_{3,6,12,24}_hour — strict trailing sums
            `${strictWindowSum('total_precipitation_1_hour', 3, 'w_3')}  AS total_precipitation_3_hour`,
            `${strictWindowSum('total_precipitation_1_hour', 6, 'w_6')}  AS total_precipitation_6_hour`,
            `${strictWindowSum('total_precipitation_1_hour', 12, 'w_12')} AS total_precipitation_12_hour`,
            `${strictWindowSum('total_precipitation_1_hour', 24, 'w_24')} AS total_precipitation_24_hour`,
            // ── Extreme temperatures ──────────────────────────────────────
            // TODO: extreme_temp_sensor_height — to come from station instrument metadata.
            `NULL AS extreme_temp_sensor_height`,
            // temp_max_period — hourly data is -1.
            `-1 AS temp_max_period`,
            `temp_maximum`,
            // TODO: temp_min_period — placeholder per TODO in SYNOP elements list.
            `-1 AS temp_min_period`,
            `temp_minimum`,
            // ── Wind ──────────────────────────────────────────────────────
            // TODO: anemometer_height — should come from station instrument metadata.
            `NULL AS anemometer_height`,
            // TODO: wind_instrument_type — to come from station instrument metadata.
            `NULL AS wind_instrument_type`,
            `wind_direction`,
            `wind_speed`,
            `max_wind_gust_direction_10min`, // TODO. Convert the knots to ms
            `maximum_wind_gust_speed_10min`,// TODO. Convert the knots to ms
            `max_wind_gust_direction_60min`,// TODO. Convert the knots to ms
            `maximum_wind_gust_speed_60min`,// TODO. Convert the knots to ms
            // ── Evaporation ───────────────────────────────────────────────
            // TODO: evaporation_sensor_height — to come from station instrument metadata.
            `NULL AS evaporation_sensor_height`,
            // evaporation_time_period — hourly data is -1.
            `-1 AS evaporation_time_period`,
            // TODO: evaporation_sensor_type — to come from station instrument metadata.
            `NULL AS evaporation_sensor_type`,
            `evaporation_total`,
            // ── Solar radiation (1-hour) ──────────────────────────────────
            // solar_radiation1_time_period — hourly data is -1.
            `-1 AS solar_radiation1_time_period`,
            `solar_radiation1_long_wave`,
            `solar_radiation1_short_wave`,
            `solar_radiation1_net`,
            `solar_radiation1_global`,
            `solar_radiation1_diffuse`,
            `solar_radiation1_direct`,
            // ── Solar radiation (24-hour) ─────────────────────────────────
            // solar_radiation24_time_period — 24-hour data is -24.
            `-24 AS solar_radiation24_time_period`,
            // 24-hour rolling sums of the 1-hour radiation channels (strict)
            `${strictWindowSum('solar_radiation1_long_wave', 24, 'w_24')} AS solar_radiation24_long_wave`,
            `${strictWindowSum('solar_radiation1_short_wave', 24, 'w_24')} AS solar_radiation24_short_wave`,
            `${strictWindowSum('solar_radiation1_net', 24, 'w_24')} AS solar_radiation24_net`,
            `${strictWindowSum('solar_radiation1_global', 24, 'w_24')} AS solar_radiation24_global`,
            `${strictWindowSum('solar_radiation1_diffuse', 24, 'w_24')} AS solar_radiation24_diffuse`,
            `${strictWindowSum('solar_radiation1_direct', 24, 'w_24')} AS solar_radiation24_direct`,
        ];

        // YYYYMMDDTHHMMSS — drop dashes/colons from ISO 8601 and trim the
        // fractional-second + trailing Z suffix.
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const outputFilePathName = path.posix.join(outputDir, `climsoft_synop_${timestamp}.csv`);

        const sql = `
            COPY (
                WITH pivoted AS (
                    SELECT
                        ${cteColumns.join(',\n                        ')}
                    FROM read_csv('${inputFilePathName}', header=true, all_varchar=true)
                    GROUP BY
                        station_id,
                        station_name,
                        wigos_id,
                        wmo_id,
                        station_latitude,
                        station_longitude,
                        station_elevation,
                        station_obs_processing_method,
                        date_time
                ),
                station_meta AS (
                    -- One row per station: identifiers + min/max observation_dt.
                    -- Identifiers are added to GROUP BY (rather than aggregated) on the
                    -- expectation that they are stable per station_id within an export.
                    SELECT
                        station_id,
                        station_name,
                        wigos_id,
                        wmo_id,
                        station_latitude,
                        station_longitude,
                        station_elevation,
                        station_obs_processing_method,
                        MIN(observation_dt) AS min_dt,
                        MAX(observation_dt) AS max_dt
                    FROM pivoted
                    GROUP BY
                        station_id,
                        station_name,
                        wigos_id,
                        wmo_id,
                        station_latitude,
                        station_longitude,
                        station_elevation,
                        station_obs_processing_method
                ),
                hourly_grid AS (
                    -- Generate a contiguous hourly timeline per station so that
                    -- LAG/ROWS windows in the outer SELECT see no row-offset gaps.
                    SELECT
                        m.* EXCLUDE (min_dt, max_dt),
                        UNNEST(generate_series(m.min_dt, m.max_dt, INTERVAL '1 hour')) AS observation_dt
                    FROM station_meta m
                ),
                filled AS (
                    -- Attach pivoted measurements to the contiguous grid; hours with no
                    -- input data get NULL-filled measurement columns.
                    SELECT
                        g.*,
                        p.* EXCLUDE (
                            station_id, station_name, wigos_id, wmo_id,
                            station_latitude, station_longitude, station_elevation,
                            station_obs_processing_method, observation_dt
                        )
                    FROM hourly_grid g
                    LEFT JOIN pivoted p USING (station_id, observation_dt)
                )
                SELECT
                    ${columns.join(',\n                    ')}
                FROM filled
                WINDOW
                    w    AS (PARTITION BY station_id ORDER BY observation_dt),
                    w_3  AS (PARTITION BY station_id ORDER BY observation_dt ROWS BETWEEN 2  PRECEDING AND CURRENT ROW),
                    w_6  AS (PARTITION BY station_id ORDER BY observation_dt ROWS BETWEEN 5  PRECEDING AND CURRENT ROW),
                    w_12 AS (PARTITION BY station_id ORDER BY observation_dt ROWS BETWEEN 11 PRECEDING AND CURRENT ROW),
                    w_24 AS (PARTITION BY station_id ORDER BY observation_dt ROWS BETWEEN 23 PRECEDING AND CURRENT ROW)
                ORDER BY station_id, observation_dt
            ) TO '${outputFilePathName}' WITH (HEADER, DELIMITER ',');
        `;

        this.logger.debug(`Executing SYNOP WIS2BOX CSV generation SQL`);

        await this.fileIOService.duckDbConn.run(sql);

        this.logger.log(`SYNOP WIS2BOX CSV generated: ${outputFilePathName}`);
    }

    /**
     * Reads the raw observations CSV from inputFilePathName, pivots it into
     * the WIS2BOX-shaped DAYCLI CSV (one row per (station, calendar day)) and
     * writes the result to outputDir.
     *
     * Two-stage SQL:
     *   1. CTE `pivoted` — group input rows by (station, day) and, for each
     *      prefix-grouped measurement, emit the 6 spec columns
     *      (`<name>_day_offset`, `_hour`, `_minute`, `_second`, value, `_flag`).
     *      Per-element transforms applied here:
     *        - Temperature columns: C -> K (+ 273.15), rounded to 2 decimals
     *      Rounding suppresses float-arithmetic noise.
     *   2. Outer SELECT — emits the WIS2BOX spec column order: parsed WIS/WMO
     *      identifiers, location, hardcoded placeholders (siting class,
     *      averaging method, thermometer height) and bare references to the
     *      6-column blocks already produced in the CTE.
     *
     * The downstream WIS2BOX instance is responsible for converting the CSV
     * into BUFR.
     */
    public async generateDayCliFiles(exportParams: Wis2BoxExportParametersDto, outputDir: string, inputFilePathName: string): Promise<void> {
        const mappingByElement = new Map<string, number>(
            exportParams.elementMappings.map(m => [m.wis2BoxElement, m.databaseElementId])
        );

        // Each DAYCLI prefix-grouped measurement expands to 6 CSV columns:
        //   <name>_day_offset, <name>_hour, <name>_minute, <name>_second, <name>, <name>_flag
        // _day_offset is hardcoded to 0 (current-day observation per WMO daily convention);
        // _flag is NULL until station element flag metadata is wired up.
        // Hour/minute/second are extracted from each element's observation timestamp.
        const pivotDayCliPrefix = (name: string, transform?: (sql: string) => string): string[] => {
            const elementId = mappingByElement.get(name);
            const dayOffset = `0 AS ${name}_day_offset`;
            // TODO. Flag values should be dynamic based on observation flag metadata.
            const flag = `NULL AS ${name}_flag`;

            if (elementId === undefined) {
                return [
                    dayOffset,
                    `NULL AS ${name}_hour`,
                    `NULL AS ${name}_minute`,
                    `NULL AS ${name}_second`,
                    `NULL AS ${name}`,
                    flag,
                ];
            }

            const valueExpr = transform ? transform('value::DOUBLE') : 'value::DOUBLE';
            return [
                dayOffset,
                `MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(HOUR FROM date_time::TIMESTAMP) END) AS ${name}_hour`,
                `MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(MINUTE FROM date_time::TIMESTAMP) END) AS ${name}_minute`,
                `MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(SECOND FROM date_time::TIMESTAMP) END) AS ${name}_second`,
                `MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN ${valueExpr} END) AS ${name}`,
                flag,
            ];
        };

        // Bare column references the outer SELECT uses to lay out the 6 prefix
        // columns produced by `pivotDayCliPrefix` in the CTE.
        const layoutPrefix = (name: string): string[] => [
            `${name}_day_offset`,
            `${name}_hour`,
            `${name}_minute`,
            `${name}_second`,
            name,
            `${name}_flag`,
        ];

        // ── CTE: pivoted measurements + identifier carriers ──────────────
        const cteColumns: string[] = [
            'station_id',
            'wigos_id',
            'wmo_id',
            'station_latitude',
            'station_longitude',
            'station_elevation',
            // Day-aligned timestamp; collapses multiple within-day observations.
            `DATE_TRUNC('day', date_time::TIMESTAMP) AS observation_dt`,
            ...pivotDayCliPrefix('precipitation'),
            ...pivotDayCliPrefix('fresh_snow_depth'),
            ...pivotDayCliPrefix('total_snow_depth'),
            // Temperatures (C -> K)
            ...pivotDayCliPrefix('maximum_temperature', this.celciusToK),
            ...pivotDayCliPrefix('minimum_temperature', this.celciusToK),
            ...pivotDayCliPrefix('average_temperature', this.celciusToK),
        ];

        // ── Outer SELECT: spec column order ──────────────────────────────
        const columns: string[] = [
            // ── Identifiers ────────────────────────────────────────────────
            // WSI parsed from wigos_id (format: series-issuer-issue_number-local)
            `COALESCE(TRY_CAST(split_part(wigos_id, '-', 1) AS INTEGER), 0) AS wsi_series`,
            `COALESCE(TRY_CAST(split_part(wigos_id, '-', 2) AS INTEGER), 0) AS wsi_issuer`,
            `COALESCE(TRY_CAST(split_part(wigos_id, '-', 3) AS INTEGER), 0) AS wsi_issue_number`,
            `COALESCE(NULLIF(split_part(wigos_id, '-', 4), ''), station_id) AS wsi_local`,
            // WMO parsed from wmo_id (format: BBBSS - 5 digits)
            `COALESCE(TRY_CAST(SUBSTRING(wmo_id, 1, 3) AS INTEGER), 0) AS wmo_block_number`,
            `COALESCE(TRY_CAST(SUBSTRING(wmo_id, 4, 2) AS INTEGER), 0) AS wmo_station_number`,
            // ── Location ──────────────────────────────────────────────────
            `station_latitude AS latitude`,
            `station_longitude AS longitude`,
            `station_elevation AS station_height_above_msl`,
            // ── Siting / averaging placeholders ───────────────────────────
            // TODO: temperature_siting_classification — to come from station instrument metadata; placeholder per WMO standard.
            `255 AS temperature_siting_classification`,
            // TODO: precipitation_siting_classification — to come from station instrument metadata; placeholder per WMO standard.
            `255 AS precipitation_siting_classification`,
            // TODO: averaging_method — to come from station element metadata; placeholder per WMO standard.
            `2 AS averaging_method`,
            // ── Date components ───────────────────────────────────────────
            `EXTRACT(YEAR FROM observation_dt)::INTEGER AS year`,
            `EXTRACT(MONTH FROM observation_dt)::INTEGER AS month`,
            `EXTRACT(DAY FROM observation_dt)::INTEGER AS day`,
            // ── Pivoted prefix-grouped measurements (6 CSV columns each) ──
            ...layoutPrefix('precipitation'),
            ...layoutPrefix('fresh_snow_depth'),
            ...layoutPrefix('total_snow_depth'),
            // TODO: thermometer_height — to come from station instrument metadata
            `NULL AS thermometer_height`,
            // ── Temperatures ──────────────────────────────────────────────
            ...layoutPrefix('maximum_temperature'),
            ...layoutPrefix('minimum_temperature'),
            ...layoutPrefix('average_temperature'),
        ];

        // YYYYMMDDTHHMMSS — drop dashes/colons from ISO 8601 and trim the
        // fractional-second + trailing Z suffix.
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const outputFilePathName = path.posix.join(outputDir, `climsoft_daycli_${timestamp}.csv`);

        const sql = `
            COPY (
                WITH pivoted AS (
                    SELECT
                        ${cteColumns.join(',\n                        ')}
                    FROM read_csv('${inputFilePathName}', header=true, all_varchar=true)
                    GROUP BY
                        station_id,
                        wigos_id,
                        wmo_id,
                        station_latitude,
                        station_longitude,
                        station_elevation,
                        DATE_TRUNC('day', date_time::TIMESTAMP)
                )
                SELECT
                    ${columns.join(',\n                    ')}
                FROM pivoted
                ORDER BY station_id, observation_dt
            ) TO '${outputFilePathName}' WITH (HEADER, DELIMITER ',');
        `;

        this.logger.debug(`Executing DayCli WIS2BOX CSV generation SQL`);

        await this.fileIOService.duckDbConn.run(sql);

        this.logger.log(`DayCli WIS2BOX CSV generated: ${outputFilePathName}`);
    }
}
