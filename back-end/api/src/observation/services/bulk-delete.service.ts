import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, StreamableFile } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { FileIOService } from 'src/shared/services/file-io.service';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
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

interface BulkDeleteSession {
    sessionId: string;
    filter: BulkObservationFilterDto;
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

    public async downloadPreviewCsv(sessionId: string): Promise<StreamableFile> {
        const session = this.getSession(sessionId);

        if (!session.previewCsvFile) {
            throw new BadRequestException('No preview file available for this session');
        }

        const fileName = path.basename(session.previewCsvFile);
        return new StreamableFile(fs.createReadStream(session.previewCsvFile), {
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
