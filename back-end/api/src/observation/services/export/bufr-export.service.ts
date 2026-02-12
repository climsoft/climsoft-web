import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BufrExportParametersDto, DAYCLI_BUFR_ELEMENTS } from 'src/metadata/export-specifications/dtos/bufr-export-parameters.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
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


    public async generateDayCliBufrFiles(exportParams: BufrExportParametersDto, rawObservationsFile: string, suffix?: string): Promise<string[]> {
        // Build the pivot aggregation expressions for each element mapping
        // For each element we need: hour, minute, second, value, flag
        const pivotExpressions: string[] = [];

        // Iterate over all DAYCLI_BUFR_ELEMENTS to ensure all columns are present in the intermediate file
        for (const bufrElement of DAYCLI_BUFR_ELEMENTS) {
            const mapping = exportParams.elementMappings.find(m => m.bufrElement === bufrElement);
            const colName = bufrElement;

            pivotExpressions.push(`0 AS ${colName}_day_offset`);

            if (mapping) {
                // Element is mapped - create pivot expressions using the database element ID
                const elementId = mapping.databaseElementId;

                // Hour column
                pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(HOUR FROM date_time::TIMESTAMP) END) AS ${colName}_hour`);

                // Minute column
                pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(MINUTE FROM date_time::TIMESTAMP) END) AS ${colName}_minute`);

                // Second column
                pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN EXTRACT(SECOND FROM date_time::TIMESTAMP) END) AS ${colName}_second`);

                // Value column
                switch (bufrElement) {
                    case 'maximum_temperature':
                    case 'minimum_temperature':
                    case 'average_temperature':
                        // TODO. 
                        // For now. We are assuming that the temperature values in the database are in Celsius and we need to convert them to Kelvin for BUFR. In future we should make this dynamic based on the metadata for the element.
                        pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN (value::DOUBLE + 273.15) END) AS ${colName}`);
                        break;
                    default:
                        pivotExpressions.push(`MAX(CASE WHEN element_id::INTEGER = ${elementId} THEN value END) AS ${colName}`);
                        break;
                }


                // TODO. 
                // For now we are assuming that the flag values will be bull in the intermediate file but in future we should make this dynamic based on the metadata for the element and the actual flag values in the database.
                pivotExpressions.push(`NULL AS ${colName}_flag`);
                //pivotExpressions.push(`MAX(CASE WHEN element_id = ${elementId} THEN CASE WHEN flag IS NULL OR flag = '' THEN 0 WHEN flag = 'trace' THEN 1 ELSE 2 END END) AS ${colName}_flag`);
            } else {
                // Element is not mapped - create NULL columns
                pivotExpressions.push(`NULL AS ${colName}_hour`);
                pivotExpressions.push(`NULL AS ${colName}_minute`);
                pivotExpressions.push(`NULL AS ${colName}_second`);
                pivotExpressions.push(`NULL AS ${colName}`);
                pivotExpressions.push(`NULL AS ${colName}_flag`);
            }
        }

        // TODO. For now we are hardcoding the belwo values  it's required by the csv2bufr template to set the correct BUFR codes, but in future we should make this dynamic based on the metadata for the station, element and instrument. 



        let intermediateFile: string = suffix ? `daycli_intermediate_${crypto.randomUUID()}_${suffix}.csv` : `daycli_intermediate_${crypto.randomUUID()}.csv`;
        intermediateFile = path.posix.join(this.fileIOService.apiExportsDir, intermediateFile);

        // Build the full SQL query
        // The query reads the input CSV, groups by station and date, and pivots elements to columns

        // WIGOS ID format: series-issuer-issue_number-local (e.g., 0-20000-0-12345)
        // WMO ID format: BBBSS (5 digits, first 3 are block number, last 2 are station number)

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
                FROM read_csv('${rawObservationsFile}', header=true, all_varchar=true)
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
            ) TO '${intermediateFile}' WITH (HEADER, DELIMITER ',');
        `;

        this.logger.debug(`Executing DayCli intermediate file generation SQL`);

        //console.log(sql); // Log the SQL for debugging purposes

        await this.fileIOService.duckDb.exec(sql);

        this.logger.log(`DayCli intermediate file generated: ${intermediateFile}`);

        // Convert the intermediate CSV to BUFR using the csv2bufr HTTP service
        return await this.convertToBufr(intermediateFile, suffix);
    }

    private async convertToBufr(intermediateFile: string, suffix?: string): Promise<string[]> {
        const csv2bufrUrl: string = `http://${AppConfig.csv2BufrCredentials.host}:${AppConfig.csv2BufrCredentials.port}/transform`;
        const inputFile: string = path.posix.join(`/app/exports/`, path.basename(intermediateFile)); // The csv2bufr service expects the input file to be in a specific directory, so we provide the relative path from that directory
        const outputDir: string = `/app/exports/`;// this.fileIOService.apiExportsDir;

        this.logger.log(`Calling csv2bufr service at ${csv2bufrUrl}`);
        //this.logger.debug(`Input: ${inputFile}, Output dir: ${outputDir}`);

        try {
            const response = await axios.post(csv2bufrUrl, {
                input_file: inputFile,
                mappings: this.daycliTemplate,
                output_dir: outputDir,
                suffix: suffix,
            }, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' },
            });


            this.logger.log(`BUFR conversion successful. Generated ${response.data.output_files.length} file(s)`);

            if (response.data.errors && response.data.errors.length > 0) {
                this.logger.warn(`BUFR conversion had partial errors: ${response.data.errors.join('; ')}`);
            }

            const generatedFiles = response.data.output_files.map((file: string) => path.posix.join(this.fileIOService.apiExportsDir, path.basename(file)));
            //this.logger.debug(`Generated BUFR files: ${generatedFiles.join(', ')}`);

            return generatedFiles;

        } catch (error) {
            this.logger.error('Error calling csv2bufr service:', error);
            if (axios.isAxiosError(error)) {
                const detail = error.response?.data || error.message;
                throw new Error(`csv2bufr service error: ${detail}`);
            }
            throw error;
        }
    }

}