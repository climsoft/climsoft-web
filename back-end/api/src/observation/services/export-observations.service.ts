import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common';
import { DataSource } from "typeorm"
import { ExportTemplateParametersDto } from 'src/metadata/export-templates/dtos/export-template-paramers.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ViewTemplateExportDto } from 'src/metadata/export-templates/dtos/view-export-template.dto';
import { ExportTemplatesService } from 'src/metadata/export-templates/services/export-templates.service';
import { AppConfig } from 'src/app.config';

@Injectable()
export class ExportObservationsService {
    constructor(
        private exportTemplatesService: ExportTemplatesService,
        private dataSource: DataSource,
        private fileIOService: FileIOService,) {
    }

    public async generateExports(exportTemplateId: number): Promise<number> {
        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        const exportParams: ExportTemplateParametersDto = viewTemplateExportDto.parameters;
        const outputPath: string = `/var/lib/postgresql/exports/${exportTemplateId}.csv`;

        // Manually construct the SQL query
        let sqlCondition: string = '';

        if (exportParams.stationIds && exportParams.stationIds.length > 0) {
            sqlCondition = ` AND station_id IN (${exportParams.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        if (exportParams.elementIds && exportParams.elementIds.length > 0) {
            sqlCondition = sqlCondition + ` AND element_id IN (${exportParams.elementIds.join(',')})`;
        }

        if (exportParams.interval) {
            sqlCondition = sqlCondition + ` AND interval = ${exportParams.interval}`;
        }

        if (exportParams.observationDate) {
            if (exportParams.observationDate.within) {
                sqlCondition = sqlCondition + ` AND date_time BETWEEN '${exportParams.observationDate.within.startDate}' AND '${exportParams.observationDate.within.endDate}'`;
            } else if (exportParams.observationDate.fromDate) {
                sqlCondition = sqlCondition + ` AND date_time >= '${exportParams.observationDate.fromDate}'`;
            } else if (exportParams.observationDate.last) {
                const duration: number = exportParams.observationDate.last.duration;
                if (exportParams.observationDate.last.durationType === 'days') {
                    sqlCondition = sqlCondition + ` AND date_time >= NOW() - INTERVAL '${duration} days'`;
                } else if (exportParams.observationDate.last.durationType === 'hours') {
                    sqlCondition = sqlCondition + ` AND date_time >= NOW() - INTERVAL '${duration} hours'`;
                } else if (exportParams.observationDate.last.durationType === 'minutes') {
                    sqlCondition = sqlCondition + ` AND date_time >= NOW() - INTERVAL '${duration} minutes'`;
                }
            }
        }

        // TODO. Add longitude and latitude
        const sql = `
            COPY (
                SELECT 
                station_id, element_id, source_id, level, interval, date_time, value, flag, comment, entry_date_time 
                FROM observations
                WHERE deleted = false 
                ${sqlCondition}
            ) TO '${outputPath}' WITH CSV HEADER;
        `;

        //console.log('Executing COPY command:', sql); // Debugging log

        // Execute raw SQL query (without parameterized placeholders)
        const results = await this.dataSource.manager.query(sql);

        console.log('PostGis copying done: ', outputPath, ' Results: ', results);

        // Return the path to the generated CSV file
        return viewTemplateExportDto.id;
    }

    public async downloadExport(exportTemplateId: number, userId: number): Promise<StreamableFile> {
        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        //const outputPath: string = (AppConfig.devMode ? this.fileIOService.tempFilesFolderPath : '/var/lib/postgresql/exports') + `/${exportTemplateId}.csv`;

        let outputPath: string = AppConfig.devMode ? this.fileIOService.tempFilesFolderPath : '/app/exports' ;
        outputPath =  `${outputPath}/${exportTemplateId}.csv`;
        console.log('Downloading from: ', outputPath);

        // TODO log the export

        return this.fileIOService.createStreamableFile(outputPath);
    }

}
