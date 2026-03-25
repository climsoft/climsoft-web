import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, StreamableFile } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileIOService } from 'src/shared/services/file-io.service';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import {
    BulkPkUpdateCheckDto,
    BulkPkUpdateCheckResponse,
    BulkPkUpdateExecuteDto,
    BulkPkUpdateExecuteResponse,
    BulkPkUpdateFilterDto,
    ConflictResolutionEnum,
    PkChangeSpecDto,
    PkFieldEnum,
} from '../dtos/bulk-pk-update.dto';
import { ClimsoftDisplayTimeZoneDto } from 'src/settings/dtos/settings/climsoft-display-timezone.dto';
import { SettingIdEnum } from 'src/settings/dtos/setting-id.enum';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';

interface BulkPkUpdateSession {
    sessionId: string;
    filter: BulkPkUpdateFilterDto;
    change: PkChangeSpecDto;
    conflictFile?: string;
    duckDbTableName?: string;
    totalMatchingRows: number;
    conflictCount: number;
    createdAt: number;
    lastAccessedAt: number;
}

@Injectable()
export class BulkPkUpdateService implements OnModuleDestroy {
    private readonly logger = new Logger(BulkPkUpdateService.name);
    private readonly sessions: Map<string, BulkPkUpdateSession> = new Map();
    private readonly SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes
    private readonly MAX_PREVIEW_ROWS = 200;

    constructor(
        private dataSource: DataSource,
        private fileIOService: FileIOService,
        private generalSettingsService: GeneralSettingsService,
        private eventEmitter: EventEmitter2,
    ) { }

    public async onModuleDestroy() {
        for (const [sessionId] of this.sessions) {
            await this.destroySession(sessionId);
        }
    }

    @Interval(60000)
    public async cleanupStaleSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions) {
            if (now - session.lastAccessedAt > this.SESSION_TTL_MS) {
                this.logger.log(`Cleaning up stale bulk PK update session: ${sessionId}`);
                await this.destroySession(sessionId);
            }
        }
    }

    public async checkForConflicts(dto: BulkPkUpdateCheckDto): Promise<BulkPkUpdateCheckResponse> {
        this.validateChangeSpec(dto.change);

        const sessionId = crypto.randomUUID();

        // Count all matching rows
        const matchingCountSql = this.buildMatchingRowsQuery(dto.filter, dto.change);
        const countResult = await this.dataSource.query(matchingCountSql.sql, matchingCountSql.params);
        const totalMatchingRows: number = countResult[0]?.cnt ?? 0;

        if (totalMatchingRows === 0) {
            const session: BulkPkUpdateSession = {
                sessionId, filter: dto.filter, change: dto.change,
                totalMatchingRows: 0, conflictCount: 0,
                createdAt: Date.now(), lastAccessedAt: Date.now(),
            };
            this.sessions.set(sessionId, session);
            return { sessionId, totalMatchingRows: 0, conflictCount: 0, permanentDeleteCount: 0 };
        }

        // Count conflicts
        const conflictCountSql = this.buildConflictCountQuery(dto.filter, dto.change);
        const conflictCountResult = await this.dataSource.query(conflictCountSql.sql, conflictCountSql.params);
        const conflictCount: number = conflictCountResult[0]?.cnt ?? 0;

        let previewData: BulkPkUpdateCheckResponse['previewData'] | undefined;

        if (conflictCount > 0) {
            // Export conflicts to CSV via a two-stage approach:
            // COPY does not support parameterized queries, so we first materialize into a
            // temp table (parameterized SELECT works fine), then COPY from the temp table.
            const conflictQuery = this.buildConflictSelectQuery(dto.filter, dto.change);
            const csvFileName = `conflict_${sessionId}.csv`;
            const dbCsvPath = path.posix.join(this.fileIOService.dbExportsDir, csvFileName);
            const apiCsvPath = path.posix.join(this.fileIOService.apiExportsDir, csvFileName);
            const tmpTable = `conflict_tmp_${sessionId.replaceAll('-', '_')}`;

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            try {
                await queryRunner.query(
                    `CREATE TEMP TABLE ${tmpTable} AS ${conflictQuery.sql}`,
                    conflictQuery.params,
                );
                await queryRunner.query(`COPY ${tmpTable} TO '${dbCsvPath}' WITH CSV HEADER`);
            } finally {
                await queryRunner.query(`DROP TABLE IF EXISTS ${tmpTable}`);
                await queryRunner.release();
            }

            // Load into DuckDB for preview
            const duckDbTableName = `conflict_${sessionId.replaceAll('-', '_')}`;
            await DuckDBUtils.createTableFromFile(
                this.fileIOService.duckDbConn, apiCsvPath, duckDbTableName, true, 0, 0
            );

            const columns = await DuckDBUtils.getColumnNames(this.fileIOService.duckDbConn, duckDbTableName);
            const rows = await DuckDBUtils.getPreviewRows(this.fileIOService.duckDbConn, duckDbTableName, this.MAX_PREVIEW_ROWS);

            previewData = { columns, rows, totalRowCount: conflictCount };

            const session: BulkPkUpdateSession = {
                sessionId, filter: dto.filter, change: dto.change,
                conflictFile: apiCsvPath, duckDbTableName,
                totalMatchingRows, conflictCount,
                createdAt: Date.now(), lastAccessedAt: Date.now(),
            };
            this.sessions.set(sessionId, session);
        } else {
            const session: BulkPkUpdateSession = {
                sessionId, filter: dto.filter, change: dto.change,
                totalMatchingRows, conflictCount: 0,
                createdAt: Date.now(), lastAccessedAt: Date.now(),
            };
            this.sessions.set(sessionId, session);
        }

        // Count soft-deleted target rows that will be permanently deleted
        const permanentDeleteSql = this.buildPermanentDeleteCountQuery(dto.filter, dto.change);
        const permanentDeleteResult = await this.dataSource.query(permanentDeleteSql.sql, permanentDeleteSql.params);
        const permanentDeleteCount: number = permanentDeleteResult[0]?.cnt ?? 0;

        return { sessionId, totalMatchingRows, conflictCount, permanentDeleteCount, previewData };
    }

    private buildMatchingRowsQuery(filter: BulkPkUpdateFilterDto, change: PkChangeSpecDto,): { sql: string; params: any[] } {
        const whereClause = this.buildFilterWhereClause(filter, change, 'o', 1);
        const sql = `SELECT COUNT(*)::int AS cnt FROM observations o WHERE o.deleted = false ${whereClause.sql}`;
        return { sql, params: whereClause.params };
    }

    private buildConflictCountQuery(filter: BulkPkUpdateFilterDto, change: PkChangeSpecDto): { sql: string; params: any[] } {
        const joinConditions = this.buildTargetPkJoinConditions(change, 'o', 'existing', 1);
        const whereClause = this.buildFilterWhereClause(filter, change, 'o', joinConditions.params.length + 1);
        const sql = `
            SELECT COUNT(*)::int AS cnt
            FROM observations o
            INNER JOIN observations existing ON ${joinConditions.sql}
            WHERE o.deleted = false AND existing.deleted = false
            ${whereClause.sql}
        `;
        const params: any[] = [...joinConditions.params, ...whereClause.params];

        return { sql, params };
    }

    private buildPermanentDeleteCountQuery(filter: BulkPkUpdateFilterDto, change: PkChangeSpecDto): { sql: string; params: any[] } {
        const joinConditions = this.buildTargetPkJoinConditions(change, 'o', 'existing', 1);
        const whereClause = this.buildFilterWhereClause(filter, change, 'o', joinConditions.params.length + 1);
        const sql = `
            SELECT COUNT(*)::int AS cnt
            FROM observations o
            INNER JOIN observations existing ON ${joinConditions.sql}
            WHERE o.deleted = false AND existing.deleted = true
            ${whereClause.sql}
        `;
        const params: any[] = [...joinConditions.params, ...whereClause.params];

        return { sql, params };
    }

    private buildConflictSelectQuery(filter: BulkPkUpdateFilterDto, change: PkChangeSpecDto): { sql: string; params: any[] } {
        const selectParams: any[] = [];

        // Build target value expression with metadata enrichment
        let targetValueExpr: string;
        let targetJoin = '';
        if (change.field === PkFieldEnum.DATE_TIME) {
            // The INTERVAL keyword requires a string literal, that is, `INTERVAL $1` is a PostgreSQL syntax error.
            // The correct parameterized form is `$1::interval` (cast), but since shiftAmount is a
            // validated non-zero integer and shiftUnit is a DateTimeShiftUnitEnum, string interpolation
            // here is safe and avoids the extra casting needed when using parameters.
            targetValueExpr = `o.date_time + ${this.buildDateTimeInterval(change)} AS target_date_time`;
        } else {
            selectParams.push(change.toValue);
            switch (change.field) {
                case PkFieldEnum.STATION_ID:
                    targetValueExpr = `$1 || ' - ' || ts.name AS target_station`;
                    targetJoin = `LEFT JOIN stations ts ON ts.id = $1`;
                    break;
                case PkFieldEnum.ELEMENT_ID:
                    targetValueExpr = `$1 || ' - ' || te.abbreviation AS target_element`;
                    targetJoin = `LEFT JOIN elements te ON te.id = $1`;
                    break;
                case PkFieldEnum.SOURCE_ID:
                    targetValueExpr = `$1 || ' - ' || tsrc.name AS target_source`;
                    targetJoin = `LEFT JOIN source_templates tsrc ON tsrc.id = $1`;
                    break;
                default:
                    targetValueExpr = `$1 AS target_${change.field}`;
                    break;
            }
        }

        const joinConditions = this.buildTargetPkJoinConditions(change, 'o', 'existing', selectParams.length + 1);
        const whereClause = this.buildFilterWhereClause(filter, change, 'o', selectParams.length + joinConditions.params.length + 1);
        const displayUtcOffset: number = (this.generalSettingsService.findOne(SettingIdEnum.DISPLAY_TIME_ZONE).parameters as ClimsoftDisplayTimeZoneDto).utcOffset;
        const sql = `
            SELECT
                o.station_id AS source_station_id, s.name AS source_station_name,
                o.element_id As source_element_id, e.abbreviation AS source_element_name,
                o.level AS source_level,
                (o.date_time + INTERVAL '${displayUtcOffset} hours')::timestamp AS source_date_time,
                o.interval AS source_interval,
                src.name AS source_source_name,
                o.value AS source_value,
                sf.abbreviation AS source_flag,
                ${targetValueExpr},
                existing.value AS existing_value,
                ef.abbreviation AS existing_flag,
                existing.qc_status AS existing_qc_status
            FROM observations o
            INNER JOIN observations existing ON ${joinConditions.sql}
            LEFT JOIN stations s ON s.id = o.station_id
            LEFT JOIN elements e ON e.id = o.element_id
            LEFT JOIN source_templates src ON src.id = o.source_id
            LEFT JOIN flags sf ON sf.id = o.flag_id
            LEFT JOIN flags ef ON ef.id = existing.flag_id
            ${targetJoin}
            WHERE o.deleted = false AND existing.deleted = false
            ${whereClause.sql}
            ORDER BY o.date_time ASC, o.station_id ASC
        `;
        const params: any[] = [...selectParams, ...joinConditions.params, ...whereClause.params];

        return { sql, params };
    }

    public async executeUpdate(dto: BulkPkUpdateExecuteDto, userId: number): Promise<BulkPkUpdateExecuteResponse> {
        const session = this.getSession(dto.sessionId);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const isOverwrite = dto.conflictResolution === ConflictResolutionEnum.OVERWRITE && session.conflictCount > 0;
            const isSkip = dto.conflictResolution === ConflictResolutionEnum.SKIP && session.conflictCount > 0;

            // Permanent-delete target rows at the destination PK to free PK slots.
            // SKIP: removes only deleted targets; 
            // OVERWRITE: removes all targets (deleted + non-deleted)
            const permanentDeleteSql = this.buildPermanentDeleteQuery(session.filter, session.change, isOverwrite);
            const permanentDeleteResult = await queryRunner.query(permanentDeleteSql.sql, permanentDeleteSql.params);
            const permanentDeleteCount: number = permanentDeleteResult[1] ?? 0;

            // Build the main UPDATE
            const updateSql = this.buildUpdateQuery(session.filter, session.change, userId, isSkip);
            const updateResult = await queryRunner.query(updateSql.sql, updateSql.params);
            const updatedCount = updateResult[1] ?? 0;

            // Compute the skipped rows
            const skippedCount = isSkip ? session.totalMatchingRows - updatedCount : 0;

            await queryRunner.commitTransaction();

            this.eventEmitter.emit('observations.saved');

            await this.destroySession(dto.sessionId);

            return { updatedCount, skippedCount, permanentDeleteCount };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }


    private buildPermanentDeleteQuery(
        filter: BulkPkUpdateFilterDto,
        change: PkChangeSpecDto,
        includeNonDeleted: boolean,
    ): { sql: string; params: any[] } {
        const joinConditions = this.buildTargetPkJoinConditions(change, 'o', 'existing', 1);
        const whereClause = this.buildFilterWhereClause(filter, change, 'o', joinConditions.params.length + 1);

        // Permanent-delete target rows at the destination PK for non-deleted source rows to free PK slots
        // existing.deleted = true only removes deleted targets. Without it aLL targets (deleted + non-deleted) will be  removed
        const deletedFilter = includeNonDeleted ? '' : ' AND existing.deleted = true';
        const sql = `
            DELETE FROM observations AS existing
            USING observations o
            WHERE ${joinConditions.sql}
            AND o.deleted = false${deletedFilter}
            ${whereClause.sql}
        `;
        const params: any[] = [...joinConditions.params, ...whereClause.params];

        return { sql, params };
    }

    private buildUpdateQuery(
        filter: BulkPkUpdateFilterDto,
        change: PkChangeSpecDto,
        userId: number,
        excludeConflicts: boolean,
    ): { sql: string; params: any[] } {

        let setClause: string;
        const setParams: any[] = [];
        if (change.field === PkFieldEnum.DATE_TIME) {
            // The INTERVAL keyword requires a string literal, that is, `INTERVAL $1` is a PostgreSQL syntax error.
            // The correct parameterized form is `$1::interval` (cast), but since shiftAmount is a
            // validated non-zero integer and shiftUnit is a DateTimeShiftUnitEnum, string interpolation
            // here is safe and avoids the extra casting needed when using parameters.
            setClause = `date_time = date_time + ${this.buildDateTimeInterval(change)}, entry_user_id = ${userId}`;
        } else {
            setClause = `${change.field} = $1, entry_user_id = ${userId}`;
            setParams.push(change.toValue);
        }

        const whereClause = this.buildFilterWhereClause(filter, change, 'observations', setParams.length + 1);

        let excludeClause = '';
        let existsConditionsParams: any[] = [];
        if (excludeConflicts) {
            const existsConditions = this.buildTargetPkJoinConditions(change, 'observations', 'ex', setParams.length + whereClause.params.length + 1);
            excludeClause = ` AND NOT EXISTS (SELECT 1 FROM observations ex WHERE ${existsConditions.sql} AND ex.deleted = false)`;
            existsConditionsParams = existsConditions.params;
        }

        const sql = `UPDATE observations SET ${setClause} WHERE deleted = false ${whereClause.sql} ${excludeClause}`;
        const params: any[] = [...setParams, ...whereClause.params, ...existsConditionsParams];

        return { sql, params };
    }

    public async downloadConflictCsv(sessionId: string): Promise<StreamableFile> {
        const session = this.getSession(sessionId);

        if (!session.conflictFile) {
            throw new BadRequestException('No conflict file available for this session');
        }

        const fileName = path.basename(session.conflictFile);
        return new StreamableFile(fs.createReadStream(session.conflictFile), {
            type: 'text/csv',
            disposition: `attachment; filename="${fileName}"`,
        });
    }

    public async destroySession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Drop DuckDB table
        if (session.duckDbTableName) {
            try {
                await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${session.duckDbTableName}`);
            } catch (err) {
                this.logger.warn(`Failed to drop DuckDB table ${session.duckDbTableName}: ${err}`);
            }
        }

        // Delete conflict CSV
        if (session.conflictFile && fs.existsSync(session.conflictFile)) {
            try {
                await fs.promises.unlink(session.conflictFile);
            } catch (err) {
                this.logger.warn(`Failed to delete conflict CSV ${session.conflictFile}: ${err}`);
            }
        }

        this.sessions.delete(sessionId);
    }

    // ─── Private Helpers ─────────────────────────────────────

    private getSession(sessionId: string): BulkPkUpdateSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found or has expired`);
        }
        session.lastAccessedAt = Date.now();
        return session;
    }

    private validateChangeSpec(change: PkChangeSpecDto): void {
        if (change.field === PkFieldEnum.DATE_TIME) {
            if (change.shiftAmount === undefined || change.shiftAmount === 0) {
                throw new BadRequestException('Shift amount must be a non-zero integer for datetime changes');
            }
            if (!change.shiftUnit) {
                throw new BadRequestException('Shift unit is required for datetime changes');
            }
        } else {
            if (change.fromValue === undefined || change.fromValue === '') {
                throw new BadRequestException('Current value (fromValue) is required for non-datetime changes');
            }
            if (change.toValue === undefined || change.toValue === '') {
                throw new BadRequestException('New value (toValue) is required for non-datetime changes');
            }
            if (change.fromValue === change.toValue) {
                throw new BadRequestException('Current value and new value must be different');
            }
        }
    }

    private buildFilterWhereClause(filter: BulkPkUpdateFilterDto, change: PkChangeSpecDto, tableAlias: string, startParamIndex: number): { sql: string; params: any[] } {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex: number = startParamIndex;

        if (filter.stationIds && filter.stationIds.length > 0) {
            conditions.push(`${tableAlias}.station_id = ANY($${paramIndex})`);
            params.push(filter.stationIds);
            paramIndex++;
        }

        if (filter.elementIds && filter.elementIds.length > 0) {
            conditions.push(`${tableAlias}.element_id = ANY($${paramIndex})`);
            params.push(filter.elementIds);
            paramIndex++;
        }

        if (filter.level !== undefined) {
            conditions.push(`${tableAlias}.level = $${paramIndex}`);
            params.push(filter.level);
            paramIndex++;
        }

        if (filter.intervals && filter.intervals.length > 0) {
            conditions.push(`${tableAlias}.interval = ANY($${paramIndex})`);
            params.push(filter.intervals);
            paramIndex++;
        }

        if (filter.sourceIds && filter.sourceIds.length > 0) {
            conditions.push(`${tableAlias}.source_id = ANY($${paramIndex})`);
            params.push(filter.sourceIds);
            paramIndex++;
        }

        if (filter.fromDate && filter.toDate) {
            conditions.push(`${tableAlias}.date_time BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            params.push(filter.fromDate, filter.toDate);
            paramIndex += 2;
        } else if (filter.fromDate) {
            conditions.push(`${tableAlias}.date_time >= $${paramIndex}`);
            params.push(filter.fromDate);
            paramIndex++;
        } else if (filter.toDate) {
            conditions.push(`${tableAlias}.date_time <= $${paramIndex}`);
            params.push(filter.toDate);
            paramIndex++;
        }

        // For datetime, no fromValue filter because shift applies to all matching rows
        if (change.field !== PkFieldEnum.DATE_TIME) {
            const dbColumn = change.field; // enum values match DB column names 
            conditions.push(`${tableAlias}.${dbColumn} = $${paramIndex}`);
            params.push(change.fromValue);
            paramIndex++;
        }

        const sql: string = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
        return { sql, params };
    }

    private buildTargetPkJoinConditions(change: PkChangeSpecDto, sourceAlias: string, targetAlias: string, startParamIndex: number): { sql: string; params: any[] } {
        const pkColumns = ['station_id', 'element_id', 'level', 'date_time', 'interval', 'source_id'];
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex: number = startParamIndex;

        for (const col of pkColumns) {
            if (col === change.field) {
                if (change.field === PkFieldEnum.DATE_TIME) {
                    // The INTERVAL keyword requires a string literal, that is, `INTERVAL $1` is a PostgreSQL syntax error.
                    // The correct parameterized form is `$1::interval` (cast), but since shiftAmount is a
                    // validated non-zero integer and shiftUnit is a DateTimeShiftUnitEnum, string interpolation
                    // here is safe and avoids the extra casting needed when using parameters.
                    conditions.push(`${targetAlias}.${col} = ${sourceAlias}.${col} + ${this.buildDateTimeInterval(change)}`);
                } else {
                    conditions.push(`${targetAlias}.${col} = $${paramIndex}`);
                    params.push(change.toValue);
                    paramIndex++;
                }
            } else {
                conditions.push(`${targetAlias}.${col} = ${sourceAlias}.${col}`);
            }
        }

        const sql: string = conditions.join(' AND ');
        return { sql, params };
    }

    private buildDateTimeInterval(change: PkChangeSpecDto): string {
        return `INTERVAL '${change.shiftAmount} ${change.shiftUnit}'`;
    }

}
