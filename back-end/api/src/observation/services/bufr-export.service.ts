import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { BufrExportParametersDto, DAYCLI_BUFR_ELEMENTS } from 'src/metadata/export-specifications/dtos/bufr-export-parameters.dto';
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';
import { AppConfig } from 'src/app.config';

@Injectable()
export class BufrExportService {
    private readonly logger = new Logger(BufrExportService.name);
    private readonly daycliTemplate: Record<string, unknown>;

    constructor(
        private fileIOService: FileIOService,
    ) {
        const templatePath = path.posix.join(__dirname, 'daycli-template.json');
        this.daycliTemplate = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    }

    /**
     * BUFR pipeline: DuckDB reads raw CSV from op.inputDir, writes pivot
     * CSV to op.intermediateDir, then csv2bufr reads from intermediate
     * and writes .bufr files to op.outputDir.
     */
    public async generateDayCliBufrFiles(exportParams: BufrExportParametersDto, op: OperationContext, rawObservationsFilePath: string): Promise<void> {
        const pivotExpressions: string[] = [];

        for (const bufrElement of DAYCLI_BUFR_ELEMENTS) {
            const mapping = exportParams.elementMappings.find(m => m.bufrElement === bufrElement);
            const colName = bufrElement;

            pivotExpressions.push(`0 AS ${colName}_day_offset`);

            if (mapping) {
                const elementId = mapping.databaseElementId;

                pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(HOUR FROM date_time::TIMESTAMP) END) AS ${colName}_hour`);
                pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(MINUTE FROM date_time::TIMESTAMP) END) AS ${colName}_minute`);
                pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(SECOND FROM date_time::TIMESTAMP) END) AS ${colName}_second`);

                switch (bufrElement) {
                    case 'maximum_temperature':
                    case 'minimum_temperature':
                    case 'average_temperature':
                        // TODO. We are assuming temperature values are in Celsius and converting to Kelvin for BUFR.
                        pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN (value::DOUBLE + 273.15) END) AS ${colName}`);
                        break;
                    default:
                        pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN value END) AS ${colName}`);
                        break;
                }

                // TODO. Flag values should be dynamic based on metadata.
                pivotExpressions.push(`NULL AS ${colName}_flag`);
            } else {
                pivotExpressions.push(`NULL AS ${colName}_hour`);
                pivotExpressions.push(`NULL AS ${colName}_minute`);
                pivotExpressions.push(`NULL AS ${colName}_second`);
                pivotExpressions.push(`NULL AS ${colName}`);
                pivotExpressions.push(`NULL AS ${colName}_flag`);
            }
        }

        // DuckDB writes the intermediate pivot CSV to op.intermediateDir
        const intermediateFileName = 'daycli_intermediate.csv';
        const intermediateFilePath = path.posix.join(op.intermediateDir, intermediateFileName);

        const sql = `
            COPY (
                SELECT
                    -- WSI identifiers parsed from wigos_id (format: series-issuer-issue_number-local)
                    COALESCE(TRY_CAST(split_part(wigos_id, '-', 1) AS INTEGER), 0) AS wsi_series,
                    COALESCE(TRY_CAST(split_part(wigos_id, '-', 2) AS INTEGER), 0) AS wsi_issuer,
                    COALESCE(TRY_CAST(split_part(wigos_id, '-', 3) AS INTEGER), 0) AS wsi_issue_number,
                    COALESCE(NULLIF(split_part(wigos_id, '-', 4), ''), station_id) AS wsi_local,
                    -- WMO identifiers parsed from wmo_id (format: BBBSS - 5 digits)
                    COALESCE(TRY_CAST(SUBSTRING(wmo_id, 1, 3) AS INTEGER), 0) AS wmo_block_number,
                    COALESCE(TRY_CAST(SUBSTRING(wmo_id, 4, 2) AS INTEGER), 0) AS wmo_station_number,
                    -- Location
                    station_latitude AS latitude,
                    station_longitude AS longitude,
                    -- Siting classification (placeholder - would need station metadata)
                    255 AS temperature_siting_classification,
                    255 AS precipitation_siting_classification,
                    -- Placeholder - would need metadata to determine correct value
                    2 AS averaging_method,
                    -- Placeholder - would need station metadata to determine if it's 1 (screen-level) or 2 (ground-level)
                    2 AS thermometer_height,
                    -- Date components (extracted from date_time)
                    EXTRACT(YEAR FROM date_time::TIMESTAMP)::INTEGER AS year,
                    EXTRACT(MONTH FROM date_time::TIMESTAMP)::INTEGER AS month,
                    EXTRACT(DAY FROM date_time::TIMESTAMP)::INTEGER AS day,
                    -- Pivoted element columns
                    ${pivotExpressions.join(',\n')}
                FROM read_csv('${rawObservationsFilePath}', header=true, all_varchar=true)
                GROUP BY
                    station_id,
                    wigos_id,
                    wmo_id,
                    station_latitude,
                    station_longitude,
                    EXTRACT(YEAR FROM date_time::TIMESTAMP),
                    EXTRACT(MONTH FROM date_time::TIMESTAMP),
                    EXTRACT(DAY FROM date_time::TIMESTAMP)
                ORDER BY
                    station_id,
                    year,
                    month,
                    day
            ) TO '${intermediateFilePath}' WITH (HEADER, DELIMITER ',');
        `;

        this.logger.debug(`Executing DayCli intermediate file generation SQL`);

        await this.fileIOService.duckDbConn.run(sql);

        this.logger.log(`DayCli intermediate file generated: ${intermediateFilePath}`);

        // Convert the intermediate CSV to BUFR using the csv2bufr HTTP service
        await this.convertToBufr(op, intermediateFileName);
    }

    /**
     * Calls the csv2bufr microservice. The service reads from
     * /app/operations/<uuid>/intermediate/ and writes .bufr files to
     * /app/operations/<uuid>/output/.
     */
    private async convertToBufr(op: OperationContext, intermediateFileName: string): Promise<void> {
        const csv2bufrUrl = `http://${AppConfig.csv2BufrCredentials.host}:${AppConfig.csv2BufrCredentials.port}/transform`;

        // csv2bufr container mounts the same operations volume at /app/operations
        const inputFile = path.posix.join('/app/operations', op.operationId, 'intermediate', intermediateFileName);
        const outputDir = path.posix.join('/app/operations', op.operationId, 'output');

        this.logger.log(`Calling csv2bufr service at ${csv2bufrUrl}`);

        try {
            const response = await axios.post(csv2bufrUrl, {
                input_file: inputFile,
                mappings: this.daycliTemplate,
                output_dir: outputDir,
            }, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' },
            });

            this.logger.log(`BUFR conversion successful. Generated ${response.data.output_files.length} file(s)`);

            if (response.data.errors && response.data.errors.length > 0) {
                this.logger.warn(`BUFR conversion had partial errors: ${response.data.errors.join('; ')}`);
            }

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const detail = error.response?.data || error.message;
                throw new Error(`csv2bufr service error: ${detail}`);
            }
            throw error;
        }
    }

}
