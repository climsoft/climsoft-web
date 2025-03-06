import { Injectable, StreamableFile } from '@nestjs/common';
import { DataSource } from "typeorm"
import { ExportTemplateParametersDto } from 'src/metadata/exports/dtos/export-template-paramers.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ViewTemplateExportDto } from 'src/metadata/exports/dtos/view-export-template.dto';
import { ExportTemplatesService } from 'src/metadata/exports/services/export-templates.service';
import { AppConfig } from 'src/app.config';

@Injectable()
export class ExportObservationsService {
    constructor(
        private exportTemplatesService: ExportTemplatesService,
        private readonly dataSource: DataSource,
        private readonly fileIOService: FileIOService,) {
    }

    public async generateExports(exportTemplateId: number): Promise<number> {
        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId)
        const exportParams: ExportTemplateParametersDto = viewTemplateExportDto.parameters;
        const outputPath: string = `/var/lib/postgresql/exports/${exportTemplateId}.csv`;

        console.log('Export output path: ', outputPath);

        // Manually construct the SQL query
        let sqlCondition: string = '';

        if (exportParams.stationIds && exportParams.stationIds.length > 0) {
            sqlCondition = ` AND station_id IN (${exportParams.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        if (exportParams.elementIds && exportParams.elementIds.length > 0) {
            sqlCondition = sqlCondition + ` AND element_id IN (${exportParams.elementIds.join(',')})`;
        }

        if (exportParams.period) {
            sqlCondition = sqlCondition + ` AND period = ${exportParams.period}`;
        }

        if (exportParams.observationDate) {
            if (exportParams.observationDate.within) {
                sqlCondition = sqlCondition + ` AND date_time BETWEEN '${exportParams.observationDate.within.startDate}' AND '${exportParams.observationDate.within.endDate}'`;
            } else if (exportParams.observationDate.fromDate) {
                sqlCondition = sqlCondition + ` AND date_time >= '${exportParams.observationDate.fromDate}'`;
            } else if (exportParams.observationDate.last) {
                // TODO.
                if (exportParams.observationDate.last.durationType === 'days') {

                } else if (exportParams.observationDate.last.durationType === 'minutes') {

                }
            }
        }

        const sql = `
            COPY (
                SELECT 
                station_id, element_id, source_id, elevation, period, date_time, value, flag, qc_status, qc_test_log, comment, entry_date_time, log 
                FROM observations
                WHERE deleted = false 
                ${sqlCondition}
            ) TO '${outputPath}' WITH CSV HEADER;
        `;

        //console.log('Executing COPY command:', sql); // Debugging log

        // Execute raw SQL query (without parameterized placeholders)
        const results = await this.dataSource.manager.query(sql);

        console.log('Copying done: ', outputPath, ' Results: ', results);

        // Return the path to the generated CSV file
        return viewTemplateExportDto.id
    }

    public async downloadExport(exportTemplateId: number, userId: number): Promise<StreamableFile> {

        const outputPath: string = (AppConfig.devMode ? this.fileIOService.tempFilesFolderPath : '/var/lib/postgresql/exports') + `/${exportTemplateId}.csv`;
       
        console.log('Downloading: ', outputPath);

        // TODO log the export
        
        return this.fileIOService.createStreamableFile(outputPath);
    }

}
