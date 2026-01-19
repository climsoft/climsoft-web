import { BadRequestException, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { DataSource } from "typeorm"
import { FileIOService } from 'src/shared/services/file-io.service';
import { ExportSpecificationsService } from 'src/metadata/export-specifications/services/export-specifications.service';
import { AppConfig } from 'src/app.config';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneDto } from 'src/settings/dtos/settings/climsoft-display-timezone.dto';
import { SettingIdEnum } from 'src/settings/dtos/setting-id.enum';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { ExportTemplatePermissionsDto, ObservationPeriodPermissionsDto } from 'src/user/dtos/permissions/user-permission.dto';
import { ViewSpecificationExportDto } from 'src/metadata/export-specifications/dtos/view-export-specification.dto';
import { RawExportParametersDto } from 'src/metadata/export-specifications/dtos/raw-export-parameters.dto';
import * as path from 'node:path';
import { ExportTypeEnum } from 'src/metadata/export-specifications/enums/export-type.enum';

@Injectable()
export class ObservationsExportService {
    private readonly logger = new Logger(ObservationsExportService.name);
    constructor(
        private exportTemplatesService: ExportSpecificationsService,
        private dataSource: DataSource,
        private fileIOService: FileIOService,
        private generalSettingsService: GeneralSettingsService,
    ) {
    }

    public async generateManualExport(exportSpecificationId: number, queryDto: ViewObservationQueryDTO, user: LoggedInUserDto): Promise<void> {
        if (!user.isSystemAdmin) {
            if (user.permissions && user.permissions.exportPermissions) {
                if (user.permissions.exportPermissions.exportTemplateIds) {
                    if (!user.permissions.exportPermissions.exportTemplateIds.includes(exportSpecificationId)) {
                        throw new BadRequestException('User not allowed to export data using the given template');
                    }
                }
            } else {
                throw new BadRequestException('User not allowed to export data');
            }
        }

        const exportFileName: string = `${user.id}_${exportSpecificationId}_export.csv`;
        const exportPermissions: ExportTemplatePermissionsDto = this.validateAndRedefineTemplateFiltersBasedOnUserQueryRequest(user, queryDto);
        await this.generateExport(exportSpecificationId, exportFileName, exportPermissions);
    }

    public async manualDownloadExport(exportSpecificationId: number, userId: number): Promise<StreamableFile> {
        const viewTemplateExportDto: ViewSpecificationExportDto = await this.exportTemplatesService.find(exportSpecificationId);

        // If export is disabled then don't generate it
        if (viewTemplateExportDto.disabled) {
            throw new BadRequestException('Export disabled');
        }

        const outputPath: string = path.posix.join(this.fileIOService.apiExportsDir, `${userId}_${exportSpecificationId}_export.csv`);
        return this.fileIOService.createStreamableFile(outputPath);
    }

    private validateAndRedefineTemplateFiltersBasedOnUserQueryRequest(user: LoggedInUserDto, queryDto: ViewObservationQueryDTO): ExportTemplatePermissionsDto {
        let exportPermissions: ExportTemplatePermissionsDto = {};

        if (user.permissions && user.permissions.exportPermissions) {
            exportPermissions = user.permissions.exportPermissions;
        }

        if (exportPermissions.stationIds) {
            if (queryDto.stationIds) {
                exportPermissions.stationIds = exportPermissions.stationIds.filter(item => queryDto.stationIds?.includes(item));
            }
        } else {
            exportPermissions.stationIds = queryDto.stationIds;
        }

        if (exportPermissions.elementIds) {
            if (queryDto.stationIds) {
                exportPermissions.elementIds = exportPermissions.elementIds.filter(item => queryDto.elementIds?.includes(item));
            }
        } else {
            exportPermissions.elementIds = queryDto.elementIds;
        }

        if (exportPermissions.intervals) {
            if (queryDto.stationIds) {
                exportPermissions.intervals = exportPermissions.intervals.filter(item => queryDto.intervals?.includes(item));
            }
        } else {
            exportPermissions.intervals = queryDto.intervals;
        }

        let observationPeriod: ObservationPeriodPermissionsDto | undefined = exportPermissions.observationPeriod;

        if (observationPeriod) {
            if (observationPeriod.within) {

                // If from date is specified the validate if it's within the allowed permissions
                if (queryDto.fromDate) {
                    if (new Date(queryDto.fromDate) < new Date(observationPeriod.within.fromDate)) {
                        throw new BadRequestException('from date can not be less than that what is allowed by the permissions');
                    }
                    observationPeriod.within.fromDate = queryDto.fromDate;
                }

                // If to date is specified the validate if it's within the allowed permissions
                if (queryDto.toDate) {
                    if (new Date(queryDto.toDate) > new Date(observationPeriod.within.toDate)) {
                        throw new BadRequestException('to date can not be greater than that what is allowed by the permissions');
                    }
                    observationPeriod.within.toDate = queryDto.toDate;
                }

            } else if (observationPeriod.fromDate) {

                // If from date is specified the validate if it's within the allowed permissions
                if (queryDto.fromDate) {
                    if (new Date(queryDto.fromDate) < new Date(observationPeriod.fromDate)) {
                        throw new BadRequestException('from date can not be less that what is allowed by the permissions');
                    }
                    observationPeriod.fromDate = queryDto.fromDate;
                }
            } else if (observationPeriod.last) {

                // TODO. validate from and to date based on specified last period
                // For now. The application will simply ignore them and use what is specified in the permissions

            }
        } else {

            // If from date and to date is specified then use within option
            if (queryDto.fromDate && queryDto.toDate) {
                observationPeriod = { within: { fromDate: queryDto.fromDate, toDate: queryDto.toDate } };
            } else if (queryDto.fromDate) {
                observationPeriod = { fromDate: queryDto.fromDate };
            } else if (queryDto.toDate) {
                throw new BadRequestException('to date only is not allowed by the permissions');
            }
        }

        exportPermissions.observationPeriod = observationPeriod;

        return exportPermissions;
    }

    public async generateExport(exportSpecificationId: number, exportFileName: string, exportPermissions: ExportTemplatePermissionsDto = {}): Promise<void> {
        const viewExportDto: ViewSpecificationExportDto = await this.exportTemplatesService.find(exportSpecificationId);

        // If export is disabled then don't generate it
        if (viewExportDto.disabled) {
            throw new Error('Export is disabled');
        }
        const exportParams: RawExportParametersDto = viewExportDto.parameters as RawExportParametersDto;

        switch (viewExportDto.exportType) {
            case ExportTypeEnum.RAW:
                this.generateRawExports(exportParams, exportFileName, exportPermissions);
                break;
            case ExportTypeEnum.AGGREGATE:
                // TODO
                break;
            case ExportTypeEnum.WISSYNOP:
                // TODO
                break;
            case ExportTypeEnum.WISDAYCLI:
                // TODO
                break;

            default:
                throw new Error('Export type no supported');
        }
    }

    public async generateRawExports(exportParams: RawExportParametersDto, exportFilePathName: string, exportPermissions: ExportTemplatePermissionsDto = {}): Promise<void> {

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

        if (exportPermissions.observationPeriod) {
            if (exportPermissions.observationPeriod.within) {
                const within = exportPermissions.observationPeriod.within;
                sqlCondition = sqlCondition + ` AND ob.date_time BETWEEN '${within.fromDate}' AND '${within.toDate}'`;
            } else if (exportPermissions.observationPeriod.fromDate) {
                sqlCondition = sqlCondition + ` AND ob.date_time >= '${exportPermissions.observationPeriod.fromDate}'`;
            } else if (exportPermissions.observationPeriod.last) {
                const durationType = exportPermissions.observationPeriod.last.durationType;
                const duration = exportPermissions.observationPeriod.last.duration;
                if (durationType === 'days') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} days'`;
                } else if (durationType === 'hours') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} hours'`;
                } else if (durationType === 'minutes') {
                    sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${duration} minutes'`;
                }
            }
        }

        if (exportPermissions.qcStatuses) {
            sqlCondition = sqlCondition + ` AND ob.qc_status = '${exportPermissions.qcStatuses}'`;
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

        // TODO. Fetch the utc setting from cache
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
        const dbFilePathName: string = path.posix.join(this.fileIOService.dbExportsDir, path.basename(exportFilePathName));
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
            ) TO '${dbFilePathName}' WITH CSV HEADER;
        `;

        //console.log('Executing COPY command:', sql); // Debugging log

        // Execute raw SQL query (without parameterized placeholders)
        const results = await this.dataSource.manager.query(sql);

        this.logger.log(`Export done:  ${exportFilePathName} . Results: ${JSON.stringify(results)}`)
    }


}