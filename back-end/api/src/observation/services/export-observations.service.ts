import { BadRequestException, Injectable, Logger, StreamableFile } from '@nestjs/common';
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
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { ExportTemplatePermissionsDto } from 'src/user/dtos/user-permission.dto';

@Injectable()
export class ExportObservationsService {
    private readonly logger = new Logger(ExportObservationsService.name);
    constructor(
        private exportTemplatesService: ExportTemplatesService,
        private dataSource: DataSource,
        private fileIOService: FileIOService,
        private generalSettingsService: GeneralSettingsService,
    ) {
    }

    public async generateExports(exportTemplateId: number, queryDto: ViewObservationQueryDTO, user: LoggedInUserDto): Promise<number> {
        if (!user.isSystemAdmin) {
            if (user.permissions && user.permissions.exportPermissions) {
                if (user.permissions.exportPermissions.exportTemplateIds) {
                    if (!user.permissions.exportPermissions.exportTemplateIds.includes(exportTemplateId)) {
                        throw new BadRequestException('User not allowed to export data using the given template');
                    }
                }
            } else {
                throw new BadRequestException('User not allowed to export data');
            }
        }

        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        const exportPermissions: ExportTemplatePermissionsDto = this.validateAndRedefineTemplateFiltersBasedOnUserQueryRequest(user, queryDto);
        const exportParams: ExportTemplateParametersDto = viewTemplateExportDto.parameters;

        // TODO. In future these conditions should create parameters for a SQL function
        // Manually construct the SQL query
        let sqlCondition: string = 'ob.deleted = false';

        // DATA FILTER SELECTIONS
        //------------------------------------------------------------------------------------------------
        if (exportPermissions.stationIds && exportPermissions.stationIds.length > 0) {
            sqlCondition = sqlCondition + ` AND ob.station_id IN (${exportPermissions.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        if (exportPermissions.elementIds && exportPermissions.elementIds.length > 0) {
            sqlCondition = sqlCondition + ` AND ob.element_id IN (${exportPermissions.elementIds.join(',')})`;
        }

        if (exportPermissions.intervals && exportPermissions.intervals.length > 0) {
            sqlCondition = sqlCondition + ` AND ob.interval IN (${exportPermissions.intervals.join(',')})`;
        }

        if (exportPermissions.observationDate) {
            if (exportPermissions.observationDate.within) {
                const within = exportPermissions.observationDate.within;
                sqlCondition = sqlCondition + ` AND ob.date_time BETWEEN '${within.fromDate}' AND '${within.toDate}'`;
            } else if (exportPermissions.observationDate.fromDate) {
                sqlCondition = sqlCondition + ` AND ob.date_time >= '${exportPermissions.observationDate.fromDate}'`;
            } else if (exportPermissions.observationDate.last) {
                const durationType = exportPermissions.observationDate.last.durationType;
                const duration = exportPermissions.observationDate.last.duration;
                if (durationType === 'days') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} days'`;
                } else if (durationType === 'hours') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} hours'`;
                } else if (durationType === 'minutes') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} minutes'`;
                }
            }
        }

        if (exportPermissions.qcStatus) {
            sqlCondition = sqlCondition + ` AND ob.qc_status = '${exportPermissions.qcStatus}'`;
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

        const displayUtcOffset: number = (((await this.generalSettingsService.find(SettingIdEnum.DISPLAY_TIME_ZONE)).parameters) as ClimsoftDisplayTimeZoneDto).utcOffset;
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
            // TODO.
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
        const outputPath: string = `/var/lib/postgresql/exports/${user.id}_${exportTemplateId}.csv`;
        const sql: string = `
            COPY (
                SELECT 
                ${columnSelections.join(',')} 
                FROM observations ob
                INNER JOIN stations st on ob.station_id = st.id
                INNER JOIN elements el on ob.element_id = el.id
                INNER JOIN source_templates so on ob.source_id = so.id
                INNER JOIN users us on ob.entry_user_id = us.id
                WHERE ${sqlCondition} 
                ORDER BY ob.date_time ASC
            ) TO '${outputPath}' WITH CSV HEADER;
        `;

        //console.log('Executing COPY command:', sql); // Debugging log

        // Execute raw SQL query (without parameterized placeholders)
        // TODO. Find away of tracking the export process at the database level
        const results = await this.dataSource.manager.query(sql);

        this.logger.log(`Export done:  ${outputPath} . Results: ${JSON.stringify(results)}`)

        // Return the path to the generated CSV file
        return viewTemplateExportDto.id;
    }

    private validateAndRedefineTemplateFiltersBasedOnUserQueryRequest(user: LoggedInUserDto, queryDto: ViewObservationQueryDTO): ExportTemplatePermissionsDto {
        let exportPermissions: ExportTemplatePermissionsDto = {};

        if (user.permissions && user.permissions.exportPermissions) {
            exportPermissions = user.permissions.exportPermissions;
        }

        if (exportPermissions.stationIds && exportPermissions.stationIds.length > 0) {
            if (queryDto.stationIds) {
                exportPermissions.stationIds = exportPermissions.stationIds.filter(item => queryDto.stationIds?.includes(item));
            }
        } else {
            exportPermissions.stationIds = queryDto.stationIds;
        }

        if (exportPermissions.elementIds && exportPermissions.elementIds.length > 0) {
            if (queryDto.stationIds) {
                exportPermissions.elementIds = exportPermissions.elementIds.filter(item => queryDto.elementIds?.includes(item));
            }
        } else {
            exportPermissions.elementIds = queryDto.elementIds;
        }

        if (exportPermissions.intervals && exportPermissions.intervals.length > 0) {
            if (queryDto.stationIds) {
                exportPermissions.intervals = exportPermissions.intervals.filter(item => queryDto.intervals?.includes(item));
            }
        } else {
            exportPermissions.intervals = queryDto.intervals;
        }

        if (exportPermissions.observationDate) {
            if (exportPermissions.observationDate.within) {
                if (queryDto.fromDate) {
                    if (new Date(queryDto.fromDate) < new Date(exportPermissions.observationDate.within.fromDate)) {
                        throw new BadRequestException('from date can not be less than that what is allowed by the template');
                    }
                    exportPermissions.observationDate.within.fromDate = queryDto.fromDate;
                }

                if (queryDto.toDate) {
                    if (new Date(queryDto.toDate) > new Date(exportPermissions.observationDate.within.toDate)) {
                        throw new BadRequestException('to date can not be greater than that what is allowed by the template');
                    }
                    exportPermissions.observationDate.within.toDate = queryDto.toDate;
                }

            } else if (exportPermissions.observationDate.fromDate) {

                if (queryDto.fromDate) {
                    if (new Date(queryDto.fromDate) < new Date(exportPermissions.observationDate.fromDate)) {
                        throw new BadRequestException('from date can not be less that what is allowed by the template');
                    }
                    exportPermissions.observationDate.fromDate = queryDto.fromDate;
                }
            }
        } else {
            if (queryDto.fromDate && queryDto.toDate) {
                exportPermissions.observationDate = { within: { fromDate: queryDto.fromDate, toDate: queryDto.toDate } };
            } else if (queryDto.fromDate) {
                exportPermissions.observationDate = { fromDate: queryDto.fromDate };
            } else if (queryDto.toDate) {
                throw new BadRequestException('to date only is not allowed by the template');
            }
        }

        return exportPermissions;
    }

    public async downloadExport(exportTemplateId: number, userId: number): Promise<StreamableFile> {
        const viewTemplateExportDto: ViewTemplateExportDto = await this.exportTemplatesService.find(exportTemplateId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        let outputPath: string = AppConfig.devMode ? this.fileIOService.tempFilesFolderPath : '/app/exports';
        outputPath = `${outputPath}/${userId}_${exportTemplateId}.csv`;
        //console.log('Downloading from: ', outputPath);

        // TODO log the export

        return this.fileIOService.createStreamableFile(outputPath);
    }

}