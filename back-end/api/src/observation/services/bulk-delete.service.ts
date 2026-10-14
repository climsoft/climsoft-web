import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, StreamableFile } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';
import { DuckDBUtils, getTableNameFromUUID } from 'src/shared/utils/duckdb.utils';
import {
    BulkDeleteCheckDto,
    BulkDeleteCheckResponse,
    BulkDeleteExecuteDto,
    BulkDeleteExecuteResponse,
} from '../dtos/bulk-delete.dto';
import { BulkObservationFilterDto } from '../dtos/bulk-observation-filter.dto';
import { BulkFilterUtils } from './bulk-filter.utils';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { SettingIdEnum } from 'src/settings/dtos/setting-id.enum';
import { ClimsoftDisplayTimeZoneDto } from 'src/settings/dtos/settings/climsoft-display-timezone.dto';
import { StreamableFileUtils } from 'src/shared/utils/streamable-file.utils';

interface BulkDeleteSession {
    sessionId: string;
    operationId: crypto.UUID;
    filter: BulkObservationFilterDto;
    totalMatchingRows: number;
    createdAt: number;
    lastAccessedAt: number;
}

@Injectable()
export class BulkDeleteService implements OnModuleDestroy {
    private readonly logger = new Logger(BulkDeleteService.name);
    private readonly sessions: Map<string, BulkDeleteSession> = new Map();
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
                this.logger.log(`Cleaning up stale bulk delete session: ${sessionId}`);
                await this.destroySession(sessionId);
            }
        }
    }

    public async checkForDeletion(dto: BulkDeleteCheckDto): Promise<BulkDeleteCheckResponse> {
        // Create an operation for file I/O
        const op: OperationContext = await this.fileIOService.createOperation();

        const sessionId: string = op.operationId;

        // Count all matching rows
        const countSql = this.buildCountQuery(dto.filter);
        const countResult = await this.dataSource.query(countSql.sql, countSql.params);
        const totalMatchingRows: number = countResult[0]?.cnt ?? 0;

        if (totalMatchingRows === 0) {
            const session: BulkDeleteSession = {
                sessionId, operationId: op.operationId, filter: dto.filter,
                totalMatchingRows: 0,
                createdAt: Date.now(), lastAccessedAt: Date.now(),
            };
            this.sessions.set(sessionId, session);
            return { sessionId, totalMatchingRows: 0 };
        }

        // Build enriched preview and export to CSV via temp table
        const previewQuery = this.buildPreviewSelectQuery(dto.filter);
        const csvFileName = `${op.operationId}.csv`;
        const dbCsvPath = path.posix.join(op.dbOutputDir, csvFileName);
        const apiCsvPath = path.posix.join(op.outputDir, csvFileName);
        const tableName = getTableNameFromUUID(op.operationId);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            await queryRunner.query(
                `CREATE TEMP TABLE ${tableName} AS ${previewQuery.sql}`,
                previewQuery.params,
            );
            await queryRunner.query(`COPY ${tableName} TO '${dbCsvPath}' WITH CSV HEADER`);
        } finally {
            await queryRunner.query(`DROP TABLE IF EXISTS ${tableName}`);
            await queryRunner.release();
        }

        // Load into DuckDB for preview, on a connection of this request's own,
        // and drop the table again as soon as the two reads are done.
        //
        // Nothing after this request looks at it: `downloadPreviewCsv` streams
        // the CSV straight from the output directory and the execute step works
        // entirely in Postgres. Keeping it would therefore pin a preview of a
        // potentially enormous match set in the in-memory instance for the whole
        // session TTL, for no reader. Dropped in a `finally` so a failed read
        // does not leak it either.
        const { columns, rows } = await this.fileIOService.withDuckDbConnection(async conn => {
            try {
                await DuckDBUtils.createTableFromFile(conn, apiCsvPath, tableName, true, 0, 0);
                return {
                    columns: await DuckDBUtils.getColumnNames(conn, tableName),
                    rows: await DuckDBUtils.getPreviewRows(conn, tableName, this.MAX_PREVIEW_ROWS),
                };
            } catch (error) {
                this.logger.error(`Failed to build the DuckDB preview for bulk delete session ${sessionId}: ${error}`);
                throw error;
            } finally {
                await DuckDBUtils.dropTable(conn, tableName);
            }
        });

        const previewData: BulkDeleteCheckResponse['previewData'] = { columns, rows, totalRowCount: totalMatchingRows };

        const session: BulkDeleteSession = {
            sessionId, operationId: op.operationId, filter: dto.filter,
            totalMatchingRows,
            createdAt: Date.now(), lastAccessedAt: Date.now(),
        };
        this.sessions.set(sessionId, session);

        return { sessionId, totalMatchingRows, previewData };
    }

    public async executeDeletion(dto: BulkDeleteExecuteDto, userId: number): Promise<BulkDeleteExecuteResponse> {
        const session = this.getSession(dto.sessionId);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const updateSql = this.buildDeleteQuery(session.filter, userId);
            const updateResult = await queryRunner.query(updateSql.sql, updateSql.params);
            const deletedCount: number = updateResult[1] ?? 0;

            await queryRunner.commitTransaction();

            this.eventEmitter.emit('observations.deleted');

            await this.destroySession(dto.sessionId);

            return { deletedCount };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    public async downloadPreviewCsv(sessionId: string): Promise<StreamableFile> {
        const session = this.getSession(sessionId);
        const op = this.fileIOService.getOperationContext(session.operationId);

        const csvFiles = await fs.promises.readdir(op.outputDir);
        if (csvFiles.length === 0) {
            throw new BadRequestException('No preview file available for this session');
        }

        const csvPath = path.posix.join(op.outputDir, csvFiles[0]);
        return StreamableFileUtils.asAttachment(fs.createReadStream(csvPath), path.basename(csvPath));
    }

    public async destroySession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Delete operation directory
        await this.fileIOService.deleteOperation(session.operationId);

        this.sessions.delete(sessionId);
    }

    // ─── Private Helpers ─────────────────────────────────────

    private getSession(sessionId: string): BulkDeleteSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found or has expired`);
        }
        session.lastAccessedAt = Date.now();
        return session;
    }

    private buildCountQuery(filter: BulkObservationFilterDto): { sql: string; params: any[] } {
        const whereClause = this.buildFilterWhereClause(filter, 'o', 1);
        const sql = `SELECT COUNT(*)::int AS cnt FROM observations o WHERE o.deleted = false ${whereClause.sql}`;
        return { sql, params: whereClause.params };
    }

    private buildPreviewSelectQuery(filter: BulkObservationFilterDto): { sql: string; params: any[] } {
        const whereClause = this.buildFilterWhereClause(filter, 'o', 1);
        const displayUtcOffset: number = (this.generalSettingsService.findOne(SettingIdEnum.DISPLAY_TIME_ZONE).parameters as ClimsoftDisplayTimeZoneDto).utcOffset;
        const sql = `
            SELECT
                o.station_id AS station_id, s.name AS station_name,
                o.element_id AS element_id, e.abbreviation AS element_name,
                o.level,
                (o.date_time + INTERVAL '${displayUtcOffset} hours')::timestamp AS date_time,
                o.interval,
                src.name AS source_name,
                o.value,
                f.abbreviation AS flag,
                o.comment,
                o.qc_status
            FROM observations o
            LEFT JOIN stations s ON s.id = o.station_id
            LEFT JOIN elements e ON e.id = o.element_id
            LEFT JOIN source_templates src ON src.id = o.source_id
            LEFT JOIN flags f ON f.id = o.flag_id
            WHERE o.deleted = false
            ${whereClause.sql}
            ORDER BY o.date_time ASC, o.station_id ASC
        `;
        return { sql, params: whereClause.params };
    }

    private buildDeleteQuery(filter: BulkObservationFilterDto, userId: number): { sql: string; params: any[] } {
        const whereClause = this.buildFilterWhereClause(filter, 'observations', 1);
        const sql = `UPDATE observations SET deleted = true, entry_user_id = ${userId} WHERE deleted = false ${whereClause.sql}`;
        return { sql, params: whereClause.params };
    }

    private buildFilterWhereClause(filter: BulkObservationFilterDto, tableAlias: string, startParamIndex: number): { sql: string; params: any[] } {
        return BulkFilterUtils.toWhereClauseSql(BulkFilterUtils.buildFilterWhereClause(filter, tableAlias, startParamIndex));
    }

}
