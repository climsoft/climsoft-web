import { Injectable, Logger } from '@nestjs/common';
import { BufrExportParametersDto } from 'src/metadata/export-specifications/dtos/bufr-export-parameters.dto';
import { BUFR_CSV_MAPPINGS } from 'src/metadata/export-specifications/dtos/bufr-converter.mappings';
import { FileIOService } from 'src/shared/services/file-io.service';

@Injectable()
export class BufrExportService {
    private readonly logger = new Logger(BufrExportService.name);

    constructor(
        private fileIOService: FileIOService,
    ) {
    }


    // expected inputFilePathName is the csv file generated from observations export. Example file is `daycli_input.csv`
    // outputFilePathName is the BUFR DayCli intermediate file to be generated. Example file is `daycli_intermediate_output.csv`
    public async generateDayCliIntermediateFile(exportParams: BufrExportParametersDto, inputFilePathName: string, outputFilePathName: string): Promise<void> {
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

        // Build the full SQL query
        // The query reads the input CSV, groups by station and date, and pivots elements to columns
        // TODO. check the group by options
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
                FROM read_csv('${inputFilePathName}', header=true, auto_detect=true)
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
            ) TO '${outputFilePathName}' WITH (HEADER, DELIMITER ',');
        `;

        this.logger.debug(`Executing DayCli intermediate file generation SQL`);

        await this.fileIOService.duckDb.exec(sql);

        this.logger.log(`DayCli intermediate file generated: ${outputFilePathName}`);

        // TODO. Send command to external BUFR converter utility to generate BUFR file from the DayCli intermediate file
        // e.g csv2bufr data transform outputFilePathName --bufr-template climsoft_dacli_template.json --output-dir ./bufr/
    }


}