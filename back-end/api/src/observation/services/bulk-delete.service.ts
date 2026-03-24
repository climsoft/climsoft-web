import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileIOService } from 'src/shared/services/file-io.service';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import {
    BulkDeleteCheckDto,
    BulkDeleteCheckResponse,
    BulkDeleteExecuteDto,
    BulkDeleteExecuteResponse,
    BulkDeleteFilterDto,
} from '../dtos/bulk-delete.dto';

interface BulkDeleteSession {
    sessionId: string;
    filter: BulkDeleteFilterDto;
    previewCsvFile?: string;
    duckDbTableName?: string;
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
        const sessionId = crypto.randomUUID();

        // Count all matching rows
        const countSql = this.buildCountQuery(dto.filter);
        const countResult = await this.dataSource.query(countSql.sql, countSql.params);
        const totalMatchingRows: number = countResult[0]?.cnt ?? 0;

        if (totalMatchingRows === 0) {
            const session: BulkDeleteSession = {
                sessionId, filter: dto.filter,
                totalMatchingRows: 0,
                createdAt: Date.now(), lastAccessedAt: Date.now(),
            };
            this.sessions.set(sessionId, session);
            return { sessionId, totalMatchingRows: 0 };
        }

        // Build enriched preview and export to CSV via temp table
        const previewQuery = this.buildPreviewSelectQuery(dto.filter);
        const csvFileName = `bulk_delete_${sessionId}.csv`;
        const dbCsvPath = path.posix.join(this.fileIOService.dbExportsDir, csvFileName);
        const apiCsvPath = path.posix.join(this.fileIOService.apiExportsDir, csvFileName);
        const tmpTable = `bulk_delete_tmp_${sessionId.replaceAll('-', '_')}`;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            await queryRunner.query(
                `CREATE TEMP TABLE ${tmpTable} AS ${previewQuery.sql}`,
                previewQuery.params,
            );
            await queryRunner.query(`COPY ${tmpTable} TO '${dbCsvPath}' WITH CSV HEADER`);
        } finally {
            await queryRunner.query(`DROP TABLE IF EXISTS ${tmpTable}`);
            await queryRunner.release();
        }

        // Load into DuckDB for preview
        const duckDbTableName = `bulk_delete_${sessionId.replaceAll('-', '_')}`;
        await DuckDBUtils.createTableFromFile(
            this.fileIOService.duckDbConn, apiCsvPath, duckDbTableName, true, 0, 0
        );

        const columns = await DuckDBUtils.getColumnNames(this.fileIOService.duckDbConn, duckDbTableName);
        const rows = await DuckDBUtils.getPreviewRows(this.fileIOService.duckDbConn, duckDbTableName, this.MAX_PREVIEW_ROWS);

        const previewData: BulkDeleteCheckResponse['previewData'] = { columns, rows, totalRowCount: totalMatchingRows };

        const session: BulkDeleteSession = {
            sessionId, filter: dto.filter,
            previewCsvFile: apiCsvPath, duckDbTableName,
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

        // Delete preview CSV
        if (session.previewCsvFile && fs.existsSync(session.previewCsvFile)) {
            try {
                await fs.promises.unlink(session.previewCsvFile);
            } catch (err) {
                this.logger.warn(`Failed to delete preview CSV ${session.previewCsvFile}: ${err}`);
            }
        }

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

    private buildCountQuery(filter: BulkDeleteFilterDto): { sql: string; params: any[] } {
        const whereClause = this.buildFilterWhereClause(filter, 'o', 1);
        const sql = `SELECT COUNT(*)::int AS cnt FROM observations o WHERE o.deleted = false ${whereClause.sql}`;
        return { sql, params: whereClause.params };
    }

    private buildPreviewSelectQuery(filter: BulkDeleteFilterDto): { sql: string; params: any[] } {
        const whereClause = this.buildFilterWhereClause(filter, 'o', 1);
        const sql = `
            SELECT
                o.station_id || ' - ' || s.name AS station,
                o.element_id || ' - ' || e.abbreviation AS element,
                o.level,
                o.date_time,
                o.interval,
                o.source_id || ' - ' || src.name AS source,
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

    private buildDeleteQuery(filter: BulkDeleteFilterDto, userId: number): { sql: string; params: any[] } {
        const whereClause = this.buildFilterWhereClause(filter, 'observations', 1);
        const sql = `UPDATE observations SET deleted = true, entry_user_id = ${userId} WHERE deleted = false ${whereClause.sql}`;
        return { sql, params: whereClause.params };
    }

    private buildFilterWhereClause(filter: BulkDeleteFilterDto, tableAlias: string, startParamIndex: number): { sql: string; params: any[] } {
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

        if (filter.hour !== undefined) {
            conditions.push(`EXTRACT(HOUR FROM ${tableAlias}.date_time) = $${paramIndex}`);
            params.push(filter.hour);
            paramIndex++;
        }

        const sql: string = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';
        return { sql, params };
    }

}
