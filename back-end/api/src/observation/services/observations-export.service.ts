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
import { DisseminationServiceEnum } from 'src/metadata/export-specifications/enums/dissemination-service.enum';
import { DisseminationExportParametersDto } from 'src/metadata/export-specifications/dtos/dissemination-export-parameters.dto';
import { Wis2BoxExportParametersDto, ReportTypeEnum } from 'src/metadata/export-specifications/dtos/wis2box-export-parameters.dto';
import { Wis2BoxExportService } from './wis2box-export.service';
import { ExportQueryModel } from 'src/metadata/export-specifications/dtos/export-query.model';
import { ObservationWindowDateFieldEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';

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
        private wis2BoxExportService: Wis2BoxExportService,
    ) {
    }

    /**
     * Generates an export and returns the operationId for later download.
     */
    public async generateManualExport(exportSpecificationId: number, queryDto: ViewObservationQueryDTO, user: LoggedInUserDto): Promise<string> {
        if (!user.isSystemAdmin) {
            if (user.permissions && user.permissions.exportPermissions) {
                // No list configured = unrestricted (user may export with any specification).
                if (user.permissions.exportPermissions.exportTemplateIds) {
                    if (!user.permissions.exportPermissions.exportTemplateIds.includes(exportSpecificationId)) {
                        throw new BadRequestException('User not allowed to export data using the given specification');
                    }
                }
            } else {
                throw new BadRequestException('User not allowed to export data');
            }
        }

        const exportQuery: ExportQueryModel = this.validateAndRedefineExportFiltersBasedOnUserQueryRequest(user, queryDto);

        const op: OperationContext = await this.fileIOService.createOperation();
        await this.generateExport(exportSpecificationId, op, exportQuery);

        return op.operationId;
    }

    /**
     * Downloads the export files from a previously generated operation.
     */
    public async manualDownloadExport(operationId: string): Promise<StreamableFile> {
        const op = this.fileIOService.getOperationContext(operationId as crypto.UUID);

        // The zip is written back into op.outputDir, so a previous download
        // attempt will leave a `<operationId>.zip` behind. Exclude it so we
        // don't nest the prior zip inside a fresh one on repeat downloads.
        const zipFileName = `${operationId}.zip`;
        const allFiles = await fs.promises.readdir(op.outputDir);
        const sourceFiles = allFiles.filter(f => f !== zipFileName);

        if (sourceFiles.length === 0) {
            throw new BadRequestException('No export files found. Please generate the export first.');
        }

        let filePath: string;
        let fileName: string;

        if (sourceFiles.length === 1) {
            fileName = sourceFiles[0];
            filePath = path.posix.join(op.outputDir, fileName);
        } else {
            fileName = zipFileName;
            filePath = path.posix.join(op.outputDir, fileName);
            const zip = new AdmZip();
            for (const f of sourceFiles) {
                zip.addLocalFile(path.posix.join(op.outputDir, f), '', f);
            }
            zip.writeZip(filePath);
        }

        return new StreamableFile(fs.createReadStream(filePath), {
            type: this.getContentTypeForFile(fileName),
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
            default:
                // e.g .bufr4 and .bufr
                return 'application/octet-stream';
        }
    }

    private validateAndRedefineExportFiltersBasedOnUserQueryRequest(
        user: LoggedInUserDto,
        queryDto: ViewObservationQueryDTO): ExportQueryModel {

        let exportPermissions: ExportPermissionsDto = {};

        if (user.permissions && user.permissions.exportPermissions) {
            // Deep clone so the narrowing logic below (which mutates nested
            // fields like `observationPeriod.within` and the `stationIds` /
            // `elementIds` / `intervals` arrays) doesn't bleed into the
            // cached permissions on `user.permissions`.
            exportPermissions = structuredClone(user.permissions.exportPermissions);
        }

        if (exportPermissions.stationIds) {
            if (queryDto.stationIds) {
                exportPermissions.stationIds = exportPermissions.stationIds.filter(item => queryDto.stationIds?.includes(item));
            }
        } else {
            exportPermissions.stationIds = queryDto.stationIds;
        }

        if (exportPermissions.elementIds) {
            if (queryDto.elementIds) {
                exportPermissions.elementIds = exportPermissions.elementIds.filter(item => queryDto.elementIds?.includes(item));
            }
        } else {
            exportPermissions.elementIds = queryDto.elementIds;
        }

        if (exportPermissions.intervals) {
            if (queryDto.intervals) {
                exportPermissions.intervals = exportPermissions.intervals.filter(item => queryDto.intervals?.includes(item));
            }
        } else {
            exportPermissions.intervals = queryDto.intervals;
        }


        if (exportPermissions.observationPeriod) {
            if (exportPermissions.observationPeriod.within) {

                if (queryDto.fromDate) {
                    if (new Date(queryDto.fromDate) < new Date(exportPermissions.observationPeriod.within.fromDate)) {
                        throw new BadRequestException('from date can not be less than that what is allowed by the permissions');
                    }
                    exportPermissions.observationPeriod.within.fromDate = queryDto.fromDate;
                }

                if (queryDto.toDate) {
                    if (new Date(queryDto.toDate) > new Date(exportPermissions.observationPeriod.within.toDate)) {
                        throw new BadRequestException('to date can not be greater than that what is allowed by the permissions');
                    }
                    exportPermissions.observationPeriod.within.toDate = queryDto.toDate;
                }

            } else if (exportPermissions.observationPeriod.fromDate) {

                if (queryDto.fromDate) {
                    if (new Date(queryDto.fromDate) < new Date(exportPermissions.observationPeriod.fromDate)) {
                        throw new BadRequestException('from date can not be less that what is allowed by the permissions');
                    }
                    exportPermissions.observationPeriod.fromDate = queryDto.fromDate;
                }
            } else if (exportPermissions.observationPeriod.last) {
                // Permission grants access to the last N minutes of data. If the
                // user submits explicit dates, narrow the window further but
                // reject anything that reaches earlier than the rolling cutoff.
                const cutoffMs: number = Date.now() - (exportPermissions.observationPeriod.last * 60 * 1000);

                if (queryDto.fromDate && new Date(queryDto.fromDate).getTime() < cutoffMs) {
                    throw new BadRequestException('from date is older than the period allowed by the permissions');
                }

                if (queryDto.fromDate && queryDto.toDate) {
                    exportPermissions.observationPeriod.within = { fromDate: queryDto.fromDate, toDate: queryDto.toDate };
                    exportPermissions.observationPeriod.last = undefined;
                } else if (queryDto.fromDate) {
                    exportPermissions.observationPeriod.fromDate = queryDto.fromDate;
                    exportPermissions.observationPeriod.last = undefined;
                } else if (queryDto.toDate) {
                    // toDate-only: clamp the lower bound to the permission cutoff.
                    exportPermissions.observationPeriod.within = { fromDate: new Date(cutoffMs).toISOString(), toDate: queryDto.toDate };
                    exportPermissions.observationPeriod.last = undefined;
                }
                // else: no user-supplied dates — keep the rolling `last` as-is.
            }
        } else {
            if (queryDto.fromDate && queryDto.toDate) {
                exportPermissions.observationPeriod = { within: { fromDate: queryDto.fromDate, toDate: queryDto.toDate } };
            } else if (queryDto.fromDate) {
                exportPermissions.observationPeriod = { fromDate: queryDto.fromDate };
            } else if (queryDto.toDate) {
                throw new BadRequestException('to date only is not allowed by the permissions');
            }
        }

        const exportQuery: ExportQueryModel = {
            stationIds: exportPermissions.stationIds,
            elementIds: exportPermissions.elementIds,
            intervals: exportPermissions.intervals,
            qcStatuses: exportPermissions.qcStatuses,
            dateField: exportPermissions.observationPeriod?.useEntryDateTime ? ObservationWindowDateFieldEnum.ENTRY : ObservationWindowDateFieldEnum.OBSERVATION,
            within: exportPermissions.observationPeriod?.within,
            fromDate: exportPermissions.observationPeriod?.fromDate,
            last: exportPermissions.observationPeriod?.last // In minutes
        }

        return exportQuery;
    }

    /**
     * Generates export files into the operation's output directory.
     *
     * Flow depends on export type and whether a post-export adapter is configured:
     * - Raw (no adapter): Postgres COPY TO -> op.outputDir
     * - Raw (with adapter): Postgres COPY TO -> op.inputDir, runner reads -> op.outputDir
     * - Dissemination: Postgres COPY TO -> op.inputDir, service-specific transformer -> op.outputDir
     */
    public async generateExport(
        exportSpecificationId: number,
        op: OperationContext,
        exportQuery: ExportQueryModel): Promise<void> {
        const viewExportDto: ViewSpecificationExportModel = this.exportTemplatesService.find(exportSpecificationId);

        if (viewExportDto.disabled) {
            throw new BadRequestException('Export is disabled');
        }

        const hasAdapter: boolean = !!viewExportDto.adapterId;

        switch (viewExportDto.exportType) {
            case ExportTypeEnum.RAW:
                if (hasAdapter) {
                    // Postgres -> inputDir, then adapter -> outputDir
                    await this.generateRawExports(viewExportDto.parameters as RawExportParametersDto, exportQuery, op.dbInputDir);
                    await this.runExportAdapter(viewExportDto, op);
                } else {
                    // Postgres -> outputDir directly
                    await this.generateRawExports(viewExportDto.parameters as RawExportParametersDto, exportQuery, op.dbOutputDir);
                }
                break;
            case ExportTypeEnum.AGGREGATE:
                throw new BadRequestException('Aggregate export not yet supported');
            case ExportTypeEnum.DISSEMINATION:
                await this.generateDisseminationExport(viewExportDto.parameters as DisseminationExportParametersDto, exportQuery, op);
                break;
            default:
                throw new BadRequestException('Export type not supported');
        }
    }

    /**
     * Dispatches by dissemination service. Each service shapes the CSV
     * to the requirements of the downstream system; format conversion
     * (e.g. BUFR) is the downstream system's responsibility.
     */
    private async generateDisseminationExport(
        params: DisseminationExportParametersDto,
        exportQuery: ExportQueryModel,
        op: OperationContext): Promise<void> {
        switch (params.service) {
            case DisseminationServiceEnum.WIS2BOX:
                await this.generateWis2BoxExport(params.parameters as Wis2BoxExportParametersDto, exportQuery, op);
                break;
            default:
                throw new BadRequestException('Dissemination service not supported');
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
            // No user context here; export adapters are triggered system-side
            // by manual exports (already authorised) or by the connector queue.
            initiatedByUserId: 0,
            initiatedAt: new Date().toISOString(),
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

    /**
     * Builds the WHERE-clause fragments common to every export flow:
     * soft-delete filter, station IDs, and the observation date range
     * (within / fromDate / last). Per-flow extras (element IDs, intervals,
     * qcStatuses, report-type interval, value IS NOT NULL) are appended by
     * the caller.
     */
    private buildBaseObservationConditions(exportQuery: ExportQueryModel): string[] {
        const conditions: string[] = ['ob.deleted = false'];

        if (exportQuery.stationIds && exportQuery.stationIds.length > 0) {
            conditions.push(`ob.station_id IN (${exportQuery.stationIds.map(id => `'${id}'`).join(',')})`);
        }

        const dateTimeCol: string = exportQuery.dateField === ObservationWindowDateFieldEnum.OBSERVATION ? 'ob.date_time' : 'ob.entry_date_time';

        if (exportQuery.within) {
            const within = exportQuery.within;
            conditions.push(`${dateTimeCol} BETWEEN '${within.fromDate}' AND '${within.toDate}'`);
        } else if (exportQuery.fromDate) {
            conditions.push(`${dateTimeCol} >= '${exportQuery.fromDate}'`);
        } else if (exportQuery.last) {
            conditions.push(`${dateTimeCol} >= NOW() - INTERVAL '${exportQuery.last} minutes'`);
        }

        return conditions;
    }

    private async generateRawExports(
        exportParams: RawExportParametersDto,
        exportQuery: ExportQueryModel,
        dbDestDir: string,
    ): Promise<void> {

        const conditions: string[] = this.buildBaseObservationConditions(exportQuery);

        if (exportQuery.elementIds && exportQuery.elementIds.length > 0) {
            conditions.push(`ob.element_id IN (${exportQuery.elementIds.join(',')})`);
        }

        if (exportQuery.intervals && exportQuery.intervals.length > 0) {
            conditions.push(`ob.interval IN (${exportQuery.intervals.join(',')})`);
        }

        if (exportQuery.qcStatuses) {
            conditions.push(`ob.qc_status = '${exportQuery.qcStatuses}'`);
        }

        const sqlCondition: string = conditions.join(' AND ');

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
                columnSelections.push('EXTRACT(HOUR FROM ob.date_time) AS hour');
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

        const fromAndWhere: string = `
            FROM observations ob
            INNER JOIN stations st on ob.station_id = st.id
            INNER JOIN elements el on ob.element_id = el.id
            INNER JOIN source_templates so on ob.source_id = so.id
            INNER JOIN users us on ob.entry_user_id = us.id
            WHERE ${sqlCondition}
        `;

        // Short-circuit if no observations match. EXISTS stops at the first
        // matching row, so we bail before writing a header-only CSV.
        const existsResult: { has_data: boolean }[] = await this.dataSource.manager.query(
            `SELECT EXISTS (SELECT 1 ${fromAndWhere}) AS has_data`,
        );
        if (!existsResult[0]?.has_data) {
            throw new BadRequestException('No observations matched the export filters');
        }

        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const dbFilePathName = path.posix.join(dbDestDir, `${timestamp}.csv`);
        const sql: string = `
            COPY (
                SELECT
                ${columnSelections.join(',')}
                ${fromAndWhere}
                ORDER BY ob.date_time ASC
            ) TO '${dbFilePathName}' WITH CSV HEADER;
        `;

        await this.dataSource.manager.query(sql);
    }

    private async generateWis2BoxExport(
        wis2BoxExportParams: Wis2BoxExportParametersDto,
        exportQuery: ExportQueryModel,
        op: OperationContext): Promise<void> {

        // Pick the per-report-type interval filter and the downstream
        // generator up front, so unimplemented types fail before we run a
        // potentially-expensive COPY.
        let intervalCondition: string | null;
        let runGenerator: (apiFilePathName: string) => Promise<void>;

        switch (wis2BoxExportParams.reportType) {
            case ReportTypeEnum.SYNOP:
                intervalCondition = 'ob.interval = 60';
                runGenerator = (apiFilePathName) =>
                    this.wis2BoxExportService.generateSynopFiles(wis2BoxExportParams, op.outputDir, apiFilePathName);
                break;
            case ReportTypeEnum.DAYCLI:
                intervalCondition = 'ob.interval = 1440';
                runGenerator = (apiFilePathName) =>
                    this.wis2BoxExportService.generateDayCliFiles(wis2BoxExportParams, op.outputDir, apiFilePathName);
                break;
            case ReportTypeEnum.CLIMAT:
            case ReportTypeEnum.TEMP:
            case ReportTypeEnum.METAR:
                throw new BadRequestException(`WIS2BOX export for report type '${wis2BoxExportParams.reportType}' is not implemented yet`);
            default:
                throw new BadRequestException('Invalid WIS2BOX report type');
        }

        const conditions: string[] = this.buildBaseObservationConditions(exportQuery);
        conditions.push(`ob.element_id IN (${wis2BoxExportParams.elementMappings.map(m => m.databaseElementId).join(',')})`);
        if (intervalCondition) {
            conditions.push(intervalCondition);
        }
        conditions.push('ob.value IS NOT NULL');
        const sqlCondition: string = conditions.join(' AND ');

        const columnSelections: string[] = [
            'ob.station_id AS station_id',
            'st.name AS station_name',
            'ST_Y(st.location) AS station_latitude',
            'ST_X(st.location) AS station_longitude',
            'st.elevation AS station_elevation',
            'st.wmo_id AS wmo_id',
            'st.wigos_id AS wigos_id',
            // Carried so SYNOP can derive station_type from it (automatic/manual/hybrid -> 0/1/3).
            'st.observation_processing_method AS station_obs_processing_method',
            'ob.element_id AS element_id',
            'el.units AS element_units',
            'ob.level AS level',
            'ob.interval AS interval',
            'ob.date_time AS date_time',
            'ob.value AS value',
        ];

        const fromAndWhere: string = `
            FROM observations ob
            INNER JOIN stations st on ob.station_id = st.id
            INNER JOIN elements el on ob.element_id = el.id
            WHERE ${sqlCondition}
        `;

        // Short-circuit if no observations match. EXISTS stops the planner at
        // the first matching row instead of scanning all of them, then we bail
        // before writing an empty CSV (which would otherwise produce a useless
        // header-only WIS2BOX file downstream).
        const existsResult: { has_data: boolean }[] = await this.dataSource.manager.query(
            `SELECT EXISTS (SELECT 1 ${fromAndWhere}) AS has_data`,
        );
        if (!existsResult[0]?.has_data) {
            throw new BadRequestException('No observations matched the export filters');
        }

        // Postgres COPY TO -> op.inputDir; the WIS2BOX transformer reads from there.
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const rawFileName = `${timestamp}.csv`;
        const apiFilePathName = path.posix.join(op.inputDir, rawFileName);
        const dbFilePathName = path.posix.join(op.dbInputDir, rawFileName);

        const sql: string = `
            COPY (
                SELECT
                    ${columnSelections.join(',\n                        ')}
                ${fromAndWhere}
                ORDER BY
                    ob.date_time ASC
            ) TO '${dbFilePathName}' WITH CSV HEADER;
        `;

        await this.dataSource.manager.query(sql);

        await runGenerator(apiFilePathName);
    }


}
