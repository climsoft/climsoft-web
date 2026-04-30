import { BadRequestException, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { DataSource } from "typeorm"
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';
import { AdapterRunnerService, AdapterRef, AdapterRunMetadata } from 'src/shared/services/adapter-runner.service';
import { ExportSpecificationsService } from 'src/metadata/export-specifications/services/export-specifications.service';
import { AdaptersService } from 'src/metadata/adapters/services/adapters.service';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneDto } from 'src/settings/dtos/settings/climsoft-display-timezone.dto';
import { SettingIdEnum } from 'src/settings/dtos/setting-id.enum';
import { LoggedInUserDto } from 'src/user/dtos/logged-in-user.dto';
import { ExportPermissionsDto, ObservationPeriodPermissionsDto } from 'src/user/dtos/permissions/user-permission.dto';
import { ViewSpecificationExportModel } from 'src/metadata/export-specifications/dtos/view-export-specification.model';
import { RawExportParametersDto } from 'src/metadata/export-specifications/dtos/raw-export-parameters.dto';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { ExportTypeEnum } from 'src/metadata/export-specifications/enums/export-type.enum';
import { BufrExportParametersDto, BufrTypeEnum } from 'src/metadata/export-specifications/dtos/bufr-export-parameters.dto';
import { BufrExportService } from './bufr-export.service';
import { getTableNameFromUUID, getUniqueTableName } from 'src/shared/utils/duckdb.utils';

@Injectable()
export class ObservationsExportService {
    private readonly logger = new Logger(ObservationsExportService.name);

    constructor(
        private exportTemplatesService: ExportSpecificationsService,
        private adaptersService: AdaptersService,
        private adapterRunnerService: AdapterRunnerService,
        private dataSource: DataSource,
        private fileIOService: FileIOService,
        private generalSettingsService: GeneralSettingsService,
        private bufrExportService: BufrExportService,
    ) {
    }

    /**
     * Generates an export and returns the operationId for later download.
     */
    public async generateManualExport(exportSpecificationId: number, queryDto: ViewObservationQueryDTO, user: LoggedInUserDto): Promise<string> {
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

        const exportPermissions: ExportPermissionsDto = this.validateAndRedefineExportFiltersBasedOnUserQueryRequest(user, queryDto);

        const op: OperationContext = await this.fileIOService.createOperation();
        await this.generateExport(exportSpecificationId, op, exportPermissions);

        return op.operationId;
    }

    /**
     * Downloads the export files from a previously generated operation.
     */
    public async manualDownloadExport(operationId: string): Promise<StreamableFile> {
        const op = this.fileIOService.getOperationContext(operationId as crypto.UUID);

        const allFiles = await fs.promises.readdir(op.outputDir);
        if (allFiles.length === 0) {
            throw new BadRequestException('No export files found. Please generate the export first.');
        }

        let filePath: string;
        let fileName: string;

        if (allFiles.length === 1) {
            fileName = allFiles[0];
            filePath = path.posix.join(op.outputDir, fileName);
        } else {
            // Multiple files - zip them
            fileName = `${operationId}.zip`;
            filePath = path.posix.join(op.outputDir, fileName);
            const zip = new AdmZip();
            for (const f of allFiles) {
                zip.addLocalFile(path.posix.join(op.outputDir, f), '', f);
            }
            zip.writeZip(filePath);
        }

        const contentType: string = this.getContentTypeForFile(fileName);

        return new StreamableFile(fs.createReadStream(filePath), {
            type: contentType,
            disposition: `attachment; filename="${fileName}"`,
        });
    }

    private getContentTypeForFile(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        switch (ext) {
            case '.csv':
                return 'text/csv';
            case '.zip':
                return 'application/zip';
            case '.bufr4':
            case '.bufr':
                return 'application/octet-stream';
            default:
                return 'application/octet-stream';
        }
    }

    private validateAndRedefineExportFiltersBasedOnUserQueryRequest(user: LoggedInUserDto, queryDto: ViewObservationQueryDTO): ExportPermissionsDto {
        let exportPermissions: ExportPermissionsDto = {};

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

                if (queryDto.fromDate) {
                    if (new Date(queryDto.fromDate) < new Date(observationPeriod.within.fromDate)) {
                        throw new BadRequestException('from date can not be less than that what is allowed by the permissions');
                    }
                    observationPeriod.within.fromDate = queryDto.fromDate;
                }

                if (queryDto.toDate) {
                    if (new Date(queryDto.toDate) > new Date(observationPeriod.within.toDate)) {
                        throw new BadRequestException('to date can not be greater than that what is allowed by the permissions');
                    }
                    observationPeriod.within.toDate = queryDto.toDate;
                }

            } else if (observationPeriod.fromDate) {

                if (queryDto.fromDate) {
                    if (new Date(queryDto.fromDate) < new Date(observationPeriod.fromDate)) {
                        throw new BadRequestException('from date can not be less that what is allowed by the permissions');
                    }
                    observationPeriod.fromDate = queryDto.fromDate;
                }
            } else if (observationPeriod.last) {
                // TODO. validate from and to date based on specified last period
            }
        } else {
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

    /**
     * Generates export files into the operation's output directory.
     *
     * Flow depends on export type and whether a post-export adapter is configured:
     * - Raw (no adapter): Postgres COPY TO -> op.outputDir
     * - Raw (with adapter): Postgres COPY TO -> op.inputDir, runner reads -> op.outputDir
     * - BUFR: Postgres COPY TO -> op.inputDir, DuckDB -> op.intermediateDir, csv2bufr -> op.outputDir
     */
    public async generateExport(exportSpecificationId: number, op: OperationContext, exportPermissions: ExportPermissionsDto = {}): Promise<void> {
        const viewExportDto: ViewSpecificationExportModel = this.exportTemplatesService.find(exportSpecificationId);

        if (viewExportDto.disabled) {
            throw new Error('Export is disabled');
        }

        const hasAdapter: boolean = !!viewExportDto.adapterId;

        switch (viewExportDto.exportType) {
            case ExportTypeEnum.RAW:
                if (hasAdapter) {
                    // Postgres -> inputDir, then adapter -> outputDir
                    await this.generateRawExports(viewExportDto.parameters as RawExportParametersDto, exportPermissions, op.dbInputDir);
                    await this.runExportAdapter(viewExportDto, op);
                } else {
                    // Postgres -> outputDir directly
                    await this.generateRawExports(viewExportDto.parameters as RawExportParametersDto, exportPermissions, op.dbOutputDir);
                }
                break;
            case ExportTypeEnum.AGGREGATE:
                break;
            case ExportTypeEnum.BUFR:
                // Postgres -> inputDir, then BUFR pipeline handles intermediate -> output
                await this.generateBufrExports(viewExportDto.parameters as BufrExportParametersDto, exportPermissions, op);
                break;
            default:
                throw new Error('Export type not supported');
        }
    }

    /**
     * Runs the post-export adapter. Reads from op.inputDir, writes to op.outputDir.
     */
    private async runExportAdapter(exportSpec: ViewSpecificationExportModel, op: OperationContext): Promise<void> {
        const adapter = this.adaptersService.find(exportSpec.adapterId!);

        if (adapter.disabled) {
            throw new Error(`Adapter '${adapter.name}' is disabled`);
        }

        const adapterRef: AdapterRef = {
            id: adapter.id,
            name: adapter.name,
            language: adapter.language,
            scriptDirName: adapter.scriptDirName,
            entryPoint: adapter.entryPoint,
        };

        const metadata: AdapterRunMetadata = {
            uploadedByUserId: 0,
            uploadedAt: new Date().toISOString(),
            sourceSpecId: exportSpec.id,
            sourceSpecName: exportSpec.name,
            stationId: null,
            utcOffset: null,
            specParameters: exportSpec.parameters as unknown as Record<string, unknown>,
            testRun: false,
        };

        const result = await this.adapterRunnerService.run(adapterRef, op.inputDir, op.outputDir, metadata);

        if (result.status !== 'success') {
            throw new Error(`Export adapter '${adapter.name}' failed: ${result.error?.message || 'unknown error'}`);
        }

        this.logger.log(`Export adapter '${adapter.name}' produced ${result.outputFiles.length} file(s)`);
    }

    public async generateRawExports(
        exportParams: RawExportParametersDto,
        exportPermissions: ExportPermissionsDto,
        dbOutputDir: string,
    ): Promise<void> {

        let sqlCondition: string = 'ob.deleted = false';

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
                sqlCondition = sqlCondition + ` AND ob.date_time >= NOW() - INTERVAL '${exportPermissions.observationPeriod.last} minutes'`;
            }
        }

        if (exportPermissions.qcStatuses) {
            sqlCondition = sqlCondition + ` AND ob.qc_status = '${exportPermissions.qcStatuses}'`;
        }

        const columnSelections: string[] = [];

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

        const displayUtcOffset: number = (this.generalSettingsService.findOne(SettingIdEnum.DISPLAY_TIME_ZONE).parameters as ClimsoftDisplayTimeZoneDto).utcOffset;

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

        const uuid: crypto.UUID = crypto.randomUUID(); 
        const dbFilePathName = path.posix.join(dbOutputDir, `${uuid}.csv`);
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

        await this.dataSource.manager.query(sql);
    }

    // TODO. Refactor to not use `ExportPermissionsDto` as it's not really related to permissions in this context.
    public async generateBufrExports(exportParams: BufrExportParametersDto, exportPermissions: ExportPermissionsDto, op: OperationContext): Promise<void> {

        let sqlCondition: string = 'ob.deleted = false';

        if (exportPermissions.stationIds && exportPermissions.stationIds.length > 0) {
            sqlCondition = `${sqlCondition} AND ob.station_id IN (${exportPermissions.stationIds.map(id => `'${id}'`).join(',')})`;
        }

        sqlCondition = `${sqlCondition} AND ob.element_id IN (${exportParams.elementMappings.map(id => id.databaseElementId).join(',')})`;

        if (exportPermissions.observationPeriod) {
            if (exportPermissions.observationPeriod.last) {
                sqlCondition = `${sqlCondition} AND ob.date_time >= NOW() - INTERVAL '${exportPermissions.observationPeriod.last} minutes'`;
            }
        }

        switch (exportParams.bufrType) {
            case BufrTypeEnum.SYNOP:
                sqlCondition = `${sqlCondition} AND ob.interval = 60`;
                break;
            case BufrTypeEnum.DAYCLI:
                sqlCondition = `${sqlCondition} AND ob.interval = 1440`;
                break;
            case BufrTypeEnum.CLIMAT:
                break;
            default:
                break;
        }

        sqlCondition = `${sqlCondition} AND ob.value IS NOT NULL`;

        const columnSelections: string[] = [];

        columnSelections.push('ob.station_id AS station_id');
        columnSelections.push('st.name AS station_name');
        columnSelections.push('ST_Y(st.location) AS station_latitude');
        columnSelections.push('ST_X(st.location) AS station_longitude');
        columnSelections.push('st.elevation AS station_elevation');
        columnSelections.push('st.wmo_id AS wmo_id');
        columnSelections.push('st.wigos_id AS wigos_id');
        columnSelections.push('ob.element_id AS element_id');
        columnSelections.push('el.units AS element_units');
        columnSelections.push('ob.level AS level');
        columnSelections.push('ob.interval AS interval');
        columnSelections.push('ob.date_time AS date_time');
        columnSelections.push('ob.value AS value');

        // Postgres COPY TO -> op.inputDir (step 1 of BUFR pipeline)
        const uniqueFileName = `bufr_raw_export.csv`;
        const dbFilePathName = path.posix.join(op.dbInputDir, uniqueFileName);
        const sql: string = `
            COPY (
                SELECT
                ${columnSelections.join(',')}
                FROM observations ob
                INNER JOIN stations st on ob.station_id = st.id
                INNER JOIN elements el on ob.element_id = el.id
                WHERE ${sqlCondition}
                ORDER BY ob.date_time ASC
            ) TO '${dbFilePathName}' WITH CSV HEADER;
        `;

        await this.dataSource.manager.query(sql);

        // The raw observations file is now in op.inputDir
        const rawObservationsFile = path.posix.join(op.inputDir, uniqueFileName);

        switch (exportParams.bufrType) {
            case BufrTypeEnum.SYNOP:
                throw new Error('SYNOP BUFR export not implemented yet');
            case BufrTypeEnum.DAYCLI:
                await this.bufrExportService.generateDayCliBufrFiles(exportParams, op, rawObservationsFile);
                return;
            case BufrTypeEnum.CLIMAT:
                throw new Error('Climat BUFR export not implemented yet');
            case BufrTypeEnum.TEMP:
                throw new Error('Temp BUFR export not implemented yet');
            default:
                throw new Error('Invalid BUFR export type');
        }

    }


}
