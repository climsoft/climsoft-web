import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common';
import { DataSource } from "typeorm"
import { ExportTemplateParametersDto } from 'src/metadata/export-templates/dtos/export-template-paramers.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ViewTemplateExportDto } from 'src/metadata/export-templates/dtos/view-export-template.dto';
import { ExportTemplatesService } from 'src/metadata/export-templates/services/export-templates.service';
import { AppConfig } from 'src/app.config';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneDto } from 'src/settings/dtos/settings/climsoft-display-timezone.dto';
import { SettingIdEnum } from 'src/settings/dtos/setting-id.enum';

@Injectable()
export class ExportObservationsService {
    constructor(
        private exportTemplatesService: ExportTemplatesService,
        private dataSource: DataSource,
        private fileIOService: FileIOService,
        private generalSettingsService: GeneralSettingsService,
    ) {
    }

    public async generateExports(exportTemplateId: number, query: ViewObservationQueryDTO, userId: number): Promise<number> {
        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        const exportParams: ExportTemplateParametersDto = this.getTemplateFiltersBasedOnQuery(viewTemplateExportDto.parameters, query);

        // Manually construct the SQL query
        let sqlCondition: string = '';

        // DATA FILTER SELECTIONS
        //------------------------------------------------------------------------------------------------
        if (exportParams.stationIds && exportParams.stationIds.length > 0) {
            sqlCondition = ` AND ob.station_id IN (${exportParams.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        if (exportParams.elementIds && exportParams.elementIds.length > 0) {
            sqlCondition = sqlCondition + ` AND ob.element_id IN (${exportParams.elementIds.join(',')})`;
        }

        if (exportParams.intervals && exportParams.intervals.length > 0) {
            sqlCondition = sqlCondition + ` AND ob.interval IN (${exportParams.intervals.join(',')})`;
        }

        if (exportParams.observationDate) {
            if (exportParams.observationDate.within) {
                const within = exportParams.observationDate.within;
                sqlCondition = sqlCondition + ` AND ob.date_time BETWEEN '${within.fromDate}' AND '${within.toDate}'`;
            } else if (exportParams.observationDate.fromDate) {
                sqlCondition = sqlCondition + ` AND ob.date_time >= '${exportParams.observationDate.fromDate}'`;
            } else if (exportParams.observationDate.last) {
                const durationType = exportParams.observationDate.last.durationType;
                const duration = exportParams.observationDate.last.duration;
                if (durationType === 'days') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} days'`;
                } else if (durationType === 'hours') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} hours'`;
                } else if (durationType === 'minutes') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} minutes'`;
                }
            }
        }

        if (exportParams.qcStatus) {
            sqlCondition = sqlCondition + ` AND ob.qc_status = '${exportParams.qcStatus}'`;
        }
        //------------------------------------------------------------------------------------------------

        const columnSelections: string[] = [];

        // METADATA SELECTIONS
        //------------------------------------------------------------------------------------------------

        columnSelections.push('ob.station_id AS station_id');
        if (exportParams.includeStationName) {
            columnSelections.push('st.name AS station_name');
        }

        if (exportParams.includeStationLocation) {
            columnSelections.push('ST_Y(st.location) AS station_latitude');
            columnSelections.push('ST_X(st.location) AS station_longitude');
        }

        if (exportParams.includeStationElevation) {
            columnSelections.push('st.elevation AS station_elevation');
        }

        columnSelections.push('ob.element_id AS element_id');
        if (exportParams.includeElementName) {
            columnSelections.push('el.name AS element_name');
        }

        if (exportParams.includeElementUnits) {
            columnSelections.push('el.units AS element_units');
        }

        if (exportParams.includeSourceName) {
            columnSelections.push('so.name AS source_name');
        }

        if (exportParams.includeLevel) {
            columnSelections.push('ob.level AS level');
        }

        if (exportParams.includeInterval) {
            columnSelections.push('ob.interval AS interval');
        }
        //------------------------------------------------------------------------------------------------

        // DATA PROCESSING SELECTIONS
        //------------------------------------------------------------------------------------------------

        const displayUtcOffset: number = ( ((await this.generalSettingsService.find(SettingIdEnum.DISPLAY_TIME_ZONE)).parameters) as ClimsoftDisplayTimeZoneDto).utcOffset ; 
        if (exportParams.convertDatetimeToDisplayTimeZone) {
            if (exportParams.splitObservationDatetime) {
                columnSelections.push(`EXTRACT(YEAR FROM (ob.date_time + INTERVAL '${displayUtcOffset} hours')) AS year`);
                columnSelections.push(`EXTRACT(MONTH FROM (ob.date_time + INTERVAL '${displayUtcOffset} hours')) AS month`);
                columnSelections.push(`EXTRACT(DAY FROM (ob.date_time + INTERVAL '${displayUtcOffset} hours')) AS day`);
                columnSelections.push(`EXTRACT(HOUR FROM (ob.date_time + INTERVAL '${displayUtcOffset} hours')) AS hour`);
                columnSelections.push(`TO_CHAR((date_time)::time, 'MI:SS') AS mins_secs`);
            } else {
                columnSelections.push(`(ob.date_time + INTERVAL '${displayUtcOffset} hours')::timestamp AS date_time`);
            }
        } else {
            if (exportParams.splitObservationDatetime) {
                columnSelections.push('EXTRACT(YEAR FROM ob.date_time) AS year');
                columnSelections.push('EXTRACT(MONTH FROM ob.date_time ) AS month');
                columnSelections.push('EXTRACT(DAY FROM ob.date_time) AS day');
                columnSelections.push('EXTRACT(HOUR FROM ob.date_time ) AS hour');
                columnSelections.push(`TO_CHAR((date_time)::time, 'MI:SS') AS mins_secs`);
            } else {
                columnSelections.push('ob.date_time::timestamp AS date_time');
            }
        }

        columnSelections.push('ob.value AS value');
        if (exportParams.unstackData) {

        } else {
            if (exportParams.includeFlag) {
                columnSelections.push('ob.flag AS flag');
            }

            if (exportParams.includeQCStatus) {
                columnSelections.push('ob.qc_status AS qc_status');
            }

            if (exportParams.includeQCTestLog) {
                columnSelections.push('ob.qc_test_log AS qc_test_log');
            }

            if (exportParams.includeComments) {
                columnSelections.push('ob.comment AS comment');
            }

            if (exportParams.includeEntryDatetime) {
                if (exportParams.convertDatetimeToDisplayTimeZone) {
                    columnSelections.push(`(ob.entry_date_time + INTERVAL '${displayUtcOffset} hours')::timestamp AS entry_date_time`);
                } else {
                    columnSelections.push('ob.entry_date_time::timestamp AS entry_date_time');
                }
            }

            if (exportParams.includeEntryUserEmail) {
                columnSelections.push('us.email AS entry_user_email');
            }

        }
        //------------------------------------------------------------------------------------------------
        const outputPath: string = `/var/lib/postgresql/exports/${userId}_${exportTemplateId}.csv`;
        const sql = `
            COPY (
                SELECT 
                ${columnSelections.join(',')} 
                FROM observations ob
                INNER JOIN stations st on ob.station_id = st.id
                INNER JOIN elements el on ob.element_id = el.id
                INNER JOIN source_templates so on ob.source_id = so.id
                INNER JOIN users us on ob.entry_user_id = us.id
                WHERE ob.deleted = false 
                ${sqlCondition} 
                ORDER BY ob.date_time ASC
            ) TO '${outputPath}' WITH CSV HEADER;
        `;

        console.log('Executing COPY command:', sql); // Debugging log

        // Execute raw SQL query (without parameterized placeholders)
        // TODO. Find away of tracking the export process at the database level
        const results = await this.dataSource.manager.query(sql);

        console.log('Postgres copying done: ', outputPath, ' Results: ', results);

        // Return the path to the generated CSV file
        return viewTemplateExportDto.id;
    }

    private getTemplateFiltersBasedOnQuery(exportParams: ExportTemplateParametersDto, query: ViewObservationQueryDTO): ExportTemplateParametersDto {

        if (exportParams.stationIds && exportParams.stationIds.length > 0) {
            if (query.stationIds) {
                exportParams.stationIds = exportParams.stationIds.filter(item => query.stationIds?.includes(item));
            }
        } else {
            exportParams.stationIds = query.stationIds;
        }

        if (exportParams.elementIds && exportParams.elementIds.length > 0) {
            if (query.stationIds) {
                exportParams.elementIds = exportParams.elementIds.filter(item => query.elementIds?.includes(item));
            }
        } else {
            exportParams.elementIds = query.elementIds;
        }

        if (exportParams.intervals && exportParams.intervals.length > 0) {
            if (query.stationIds) {
                exportParams.intervals = exportParams.intervals.filter(item => query.intervals?.includes(item));
            }
        } else {
            exportParams.intervals = query.intervals;
        }



        if (exportParams.observationDate) {
            if (exportParams.observationDate.within) {
                if (query.fromDate) {
                    if (new Date(query.fromDate) < new Date(exportParams.observationDate.within.fromDate)) {
                        throw new BadRequestException('from date can not be less that what is allowed by the template');
                    }
                    exportParams.observationDate.within.fromDate = query.fromDate;
                }

                if (query.toDate) {
                    if (new Date(query.toDate) > new Date(exportParams.observationDate.within.toDate)) {
                        throw new BadRequestException('to date can not be greater that what is allowed by the template');
                    }
                    exportParams.observationDate.within.toDate = query.toDate;
                }

            } else if (exportParams.observationDate.fromDate) {

                if (query.fromDate) {
                    if (new Date(query.fromDate) < new Date(exportParams.observationDate.fromDate)) {
                        throw new BadRequestException('from date can not be less that what is allowed by the template');
                    }
                    exportParams.observationDate.fromDate = query.fromDate;
                }
            }
        }

        return exportParams;
    }

    public async downloadExport(exportTemplateId: number, userId: number): Promise<StreamableFile> {
        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        let outputPath: string = AppConfig.devMode ? this.fileIOService.tempFilesFolderPath : '/app/exports';
        outputPath = `${outputPath}/${userId}_${exportTemplateId}.csv`;
        console.log('Downloading from: ', outputPath);

        // TODO log the export

        return this.fileIOService.createStreamableFile(outputPath);
    }

}
