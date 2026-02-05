import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BufrExportParametersDto } from 'src/metadata/export-specifications/dtos/bufr-export-parameters.dto';
import { BUFR_CSV_MAPPINGS } from 'src/metadata/export-specifications/dtos/bufr-converter.mappings';
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


    public async generateDayCliBufrFiles(exportParams: BufrExportParametersDto, rawObservationsFile: string, suffix: string = ''): Promise<string[]> {
        // Build the pivot aggregation expressions for each element mapping
        // For each element we need: hour, minute, second, value, flag
        const pivotExpressions: string[] = [];

        for (const mapping of exportParams.elementMappings) {
            const bufrMapping = BUFR_CSV_MAPPINGS.find(m => m.id === mapping.bufrConverterId);
            if (!bufrMapping) {
                continue;
            }

            const elementId = mapping.databaseElementId;
            const colName = bufrMapping.columnName;

            // Hour column
            pivotExpressions.push(`MAX(CASE WHEN element_id = ${elementId} THEN EXTRACT(HOUR FROM date_time) END) AS ${colName}_hour`);

            // Minute column
            pivotExpressions.push(`MAX(CASE WHEN element_id = ${elementId} THEN EXTRACT(MINUTE FROM date_time) END) AS ${colName}_minute`);

            // Second column
            pivotExpressions.push(`MAX(CASE WHEN element_id = ${elementId} THEN EXTRACT(SECOND FROM date_time) END) AS ${colName}_second`);

            // Value column
            pivotExpressions.push(`MAX(CASE WHEN element_id = ${elementId} THEN value END) AS ${colName}`);

            // Flag column (convert flag text to numeric: empty/null = 0, 'trace' or other = specific codes)
            pivotExpressions.push(`MAX(CASE WHEN element_id = ${elementId} THEN CASE WHEN flag IS NULL OR flag = '' THEN 0 WHEN flag = 'trace' THEN 1 ELSE 2 END END) AS ${colName}_flag`);
        }


        const intermediateFile: string = '_daycli_intermediate.csv'; // TODO. Generate unique file name

        // Build the full SQL query
        // The query reads the input CSV, groups by station and date, and pivots elements to columns
        const sql = `
            COPY (
                SELECT
                    -- WSI identifiers (placeholder values - would need station metadata for real values)
                    0 AS wsi_series,
                    20000 AS wsi_issuer,
                    0 AS wsi_issue_number,
                    station_id AS wsi_local,
                    -- WMO identifiers (placeholder values - would need station metadata for real values)
                    0 AS wmo_block_number,
                    0 AS wmo_station_number,
                    -- Location
                    station_latitude AS latitude,
                    station_longitude AS longitude,
                    -- Siting classification (placeholder - would need station metadata)
                    255 AS precipitation_siting_classification,
                    -- Date components (extracted from date_time)
                    EXTRACT(YEAR FROM date_time)::INTEGER AS year,
                    EXTRACT(MONTH FROM date_time)::INTEGER AS month,
                    EXTRACT(DAY FROM date_time)::INTEGER AS day,
                    -- Pivoted element columns
                    ${pivotExpressions.join(',\\n')}
                FROM read_csv('${rawObservationsFile}', header=true, auto_detect=true)
                GROUP BY
                    station_id,
                    station_latitude,
                    station_longitude,
                    EXTRACT(YEAR FROM date_time),
                    EXTRACT(MONTH FROM date_time),
                    EXTRACT(DAY FROM date_time)
                ORDER BY
                    station_id,
                    year,
                    month,
                    day
            ) TO '${intermediateFile}' WITH (HEADER, DELIMITER ',');
        `;

        this.logger.debug(`Executing DayCli intermediate file generation SQL`);

        await this.fileIOService.duckDb.exec(sql);

        this.logger.log(`DayCli intermediate file generated: ${intermediateFile}`);

        // Convert the intermediate CSV to BUFR using the csv2bufr HTTP service
        return await this.convertToBufr(intermediateFile, suffix);
    }

    private async convertToBufr(intermediateFile: string, suffix: string = ''): Promise<string[]> {
        const csv2bufrUrl: string = `http://${AppConfig.csv2BufrCredentials.host}:${AppConfig.csv2BufrCredentials.port}/transform`;
        const inputFile: string = intermediateFile;
        const outputDir: string = this.fileIOService.apiExportsDir;

        this.logger.log(`Calling csv2bufr service at ${csv2bufrUrl}`);
        this.logger.debug(`Input: ${inputFile}, Output dir: ${outputDir}`);

        try {
            // TODO. 
            // Include the suffix in the post body and add the necessary code in the csv2bufr service to add the suffix to output unique buffr file names if the suffix is provide.
            const response = await axios.post(csv2bufrUrl, {
                input_file: inputFile,
                mappings: this.daycliTemplate,
                output_dir: outputDir,
            }, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.data.success) {
                this.logger.log(`BUFR conversion successful. Generated ${response.data.output_files.length} file(s)`);

                if (response.data.errors && response.data.errors.length > 0) {
                    this.logger.warn(`BUFR conversion had partial errors: ${response.data.errors.join('; ')}`);
                }

                return response.data.output_files;
            } else {
                const errorMsg = response.data.errors?.join('; ') || 'Unknown error';
                throw new Error(`csv2bufr conversion failed: ${errorMsg}`);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const detail = error.response?.data?.errors?.join('; ') || error.message;
                this.logger.error(`csv2bufr HTTP error: ${detail}`);
                throw new Error(`csv2bufr service error: ${detail}`);
            }
            throw error;
        }
    }

}