import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { StationImportTransformer } from '../stations/services/station-import-transformer';
import { ElementImportTransformer } from '../elements/services/element-import-transformer';
import { StationsService } from '../stations/services/stations.service';
import { ElementsService } from '../elements/services/elements.service';
import {
    StationColumnMappingDto,
    ElementColumnMappingDto,
} from '../dtos/metadata-import-preview.dto';
import { CreateStationDto } from '../stations/dtos/create-station.dto';
import { CreateViewElementDto } from '../elements/dtos/elements/create-view-element.dto';
import { PreviewError, PreviewTableData, RawPreviewResponse, TransformedPreviewResponse } from 'src/observation/dtos/import-preview.dto';
import { PreviewSession } from 'src/observation/services/import-preview.service';


@Injectable()
export class MetadataImportPreviewService implements OnModuleDestroy {
    private readonly logger: Logger = new Logger(MetadataImportPreviewService.name);
    private readonly sessions: Map<string, PreviewSession> = new Map();
    private readonly MAX_PREVIEW_ROWS = 200;
    private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

    constructor(
        private fileIOService: FileIOService,
        private stationsService: StationsService,
        private elementsService: ElementsService,
    ) { }

    public async onModuleDestroy() {
        for (const sessionId of this.sessions.keys()) {
            await this.destroySession(sessionId);
        }
    }

    @Interval(60000)
    public async cleanupStaleSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions) {
            if (now - session.lastAccessedAt > this.SESSION_TTL_MS) {
                this.logger.log(`Cleaning up stale metadata preview session: ${sessionId}`);
                await this.destroySession(sessionId);
            }
        }
    }

    // ─── Upload & Raw Preview ────────────────────────────────

    public async initAndPreviewRawData(file: Express.Multer.File, rowsToSkip: number, delimiter?: string): Promise<RawPreviewResponse> {
        const sessionId = crypto.randomUUID();
        const timestamp = Date.now();

        const ext = path.extname(file.originalname);
        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, `metadata_preview_${sessionId.substring(0, 8)}_${timestamp}${ext}`);
        await fs.promises.writeFile(importFilePathName, file.buffer);

        const session: PreviewSession = {
            sessionId,
            fileName: path.basename(importFilePathName),
            rowsToSkip,
            delimiter,
            createdAt: timestamp,
            lastAccessedAt: timestamp,
        };

        this.sessions.set(sessionId, session);

        return this.previewRawData(session);
    }

    public async updateBaseParamsAndPreviewRawData(sessionId: string, rowsToSkip: number, delimiter?: string): Promise<RawPreviewResponse> {
        const session = this.getSession(sessionId);
        session.rowsToSkip = rowsToSkip;
        session.delimiter = delimiter;
        session.lastAccessedAt = Date.now();

        return this.previewRawData(session);
    }

    public async previewRawData(session: PreviewSession): Promise<RawPreviewResponse> {
        // Load the whole file into DuckDB (resets to raw state for idempotent preview)
        const importFilePathName: string = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
        const tableName: string = DuckDBUtils.getTableNameFromFileName(importFilePathName);
        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, session.rowsToSkip, 0, session.delimiter);

        // Get preview data
        const previewData: PreviewTableData = {
            columns: await this.getColumnNames(tableName),
            rows: await this.getPreviewRows(tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await this.getTotalRowCount(tableName),
        };
        const skippedData: PreviewTableData = await this.getSkippedData(importFilePathName, session.rowsToSkip, session.delimiter);

        return { sessionId: session.sessionId, fileName: session.fileName, previewData, skippedData };
    }

    // ─── Station Transform & Preview ─────────────────────────

    public async previewTransformedStationData(sessionId: string, stnMapping: StationColumnMappingDto): Promise<TransformedPreviewResponse> {
        const session = this.getSession(sessionId);
        session.lastAccessedAt = Date.now();

        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
        const tableName: string = DuckDBUtils.getTableNameFromFileName(importFilePathName);
        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, session.rowsToSkip, 0, session.delimiter);

        const error: PreviewError | void = await StationImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, stnMapping);

        // Return the current table state (includes all successful transformations) 
        const previewData: PreviewTableData = {
            columns: await this.getColumnNames(tableName),
            rows: await this.getPreviewRows(tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await this.getTotalRowCount(tableName),
        };

        return { previewData, error: error ? error : undefined };

    }

    public async importStationData(sessionId: string, stnMapping: StationColumnMappingDto, userId: number): Promise<void> {
        const session = this.getSession(sessionId);

        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
        const tableName: string = DuckDBUtils.getTableNameFromFileName(importFilePathName);
        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, session.rowsToSkip, 0, session.delimiter);

        const error: PreviewError | void = await StationImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, stnMapping);
        if (error) {
            throw new Error(`Station import transformation failed at step "${error.message}"`);
        }

        // Export to CSV
        const timestamp = Date.now();
        const exportFilePathName = path.posix.join(this.fileIOService.apiImportsDir, `stations_import_processed_${timestamp}.csv`);
        await StationImportTransformer.exportTransformedDataToFile(this.fileIOService.duckDbConn, tableName, exportFilePathName);
        await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tableName};`);

        // Import to PostgreSQL using bulkPut (reads CSV rows as DTOs)
        await this.importStationsFromCsv(exportFilePathName, userId);
    }

    private async importStationsFromCsv(filePathName: string, userId: number): Promise<void> {
        // Read the exported CSV back using DuckDB to get row objects
        const tmpTableName = `stations_csv_read_${Date.now()}`;
        await this.fileIOService.duckDbConn.run(`CREATE OR REPLACE TABLE ${tmpTableName} AS SELECT * FROM read_csv('${filePathName}', header = true, all_varchar = true);`);

        const reader = await this.fileIOService.duckDbConn.runAndReadAll(`SELECT * FROM ${tmpTableName};`);
        const rows = reader.getRowObjects() as any[];

        await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tmpTableName};`);

        // Convert to DTOs and bulk upsert
        const dtos: CreateStationDto[] = rows.map(row => ({
            id: row[StationImportTransformer.ID_PROPERTY],
            name: row[StationImportTransformer.NAME_PROPERTY],
            description: row[StationImportTransformer.DESCRIPTION_PROPERTY] || undefined,
            stationObsProcessingMethod: row[StationImportTransformer.OBS_PROC_METHOD_PROPERTY] || undefined,
            latitude: row[StationImportTransformer.LATITUDE_PROPERTY] ? parseFloat(row[StationImportTransformer.LATITUDE_PROPERTY]) : undefined,
            longitude: row[StationImportTransformer.LONGITUDE_PROPERTY] ? parseFloat(row[StationImportTransformer.LONGITUDE_PROPERTY]) : undefined,
            elevation: row[StationImportTransformer.ELEVATION_PROPERTY] ? parseFloat(row[StationImportTransformer.ELEVATION_PROPERTY]) : undefined,
            stationObsEnvironmentId: row[StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY] ? parseInt(row[StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY], 10) : undefined,
            stationObsFocusId: row[StationImportTransformer.OBS_FOCUS_ID_PROPERTY] ? parseInt(row[StationImportTransformer.OBS_FOCUS_ID_PROPERTY], 10) : undefined,
            ownerId: row[StationImportTransformer.OWNER_ID_PROPERTY] ? parseInt(row[StationImportTransformer.OWNER_ID_PROPERTY], 10) : undefined,
            operatorId: row[StationImportTransformer.OPERATOR_ID_PROPERTY] ? parseInt(row[StationImportTransformer.OPERATOR_ID_PROPERTY], 10) : undefined,
            wmoId: row[StationImportTransformer.WMO_ID_PROPERTY] || undefined,
            wigosId: row[StationImportTransformer.WIGOS_ID_PROPERTY] || undefined,
            icaoId: row[StationImportTransformer.ICAO_ID_PROPERTY] || undefined,
            status: row[StationImportTransformer.STATUS_PROPERTY] || undefined,
            dateEstablished: row[StationImportTransformer.DATE_ESTABLISHED_PROPERTY] || undefined,
            dateClosed: row[StationImportTransformer.DATE_CLOSED_PROPERTY] || undefined,
            comment: row[StationImportTransformer.COMMENT_PROPERTY] || undefined,
        }));

        await this.stationsService.bulkPut(dtos, userId);
    }

    // ─── Element Transform & Preview ─────────────────────────

    public async previewTransformedElementsData(sessionId: string,   elementMapping: ElementColumnMappingDto): Promise<TransformedPreviewResponse> {
        const session = this.getSession(sessionId);
        session.lastAccessedAt = Date.now();

        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
        const tableName: string = DuckDBUtils.getTableNameFromFileName(importFilePathName);
        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, session.rowsToSkip, 0, session.delimiter);

        const error: PreviewError | void = await ElementImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, elementMapping);

        // Return the current table state (includes all successful transformations) 
        const previewData: PreviewTableData = {
            columns: await this.getColumnNames(tableName),
            rows: await this.getPreviewRows(tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await this.getTotalRowCount(tableName),
        };

        return { previewData, error: error ? error : undefined };
    }

    public async importElementsData(sessionId: string, elementMapping: ElementColumnMappingDto, userId: number): Promise<void> {
        const session = this.getSession(sessionId);

        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
        const tableName: string = DuckDBUtils.getTableNameFromFileName(importFilePathName);
        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, session.rowsToSkip, 0, session.delimiter);

        const error = await ElementImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, elementMapping);
        if (error) {
            throw new Error(`Element import transformation failed at step "${error.message}"`);
        }

        // Export to CSV
        const timestamp = Date.now();
        const exportFilePathName = path.posix.join(this.fileIOService.apiImportsDir, `elements_import_processed_${timestamp}.csv`);
        await ElementImportTransformer.exportTransformedDataToFile(this.fileIOService.duckDbConn, tableName, exportFilePathName);
        await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tableName};`);

        try {
            await this.importElementsFromCsv(exportFilePathName, userId);
        } finally {
            this.fileIOService.deleteFile(exportFilePathName);
        }
    }

    private async importElementsFromCsv(filePathName: string, userId: number): Promise<void> {
        const tmpTableName = `elements_csv_read_${Date.now()}`;
        await this.fileIOService.duckDbConn.run(`CREATE OR REPLACE TABLE ${tmpTableName} AS SELECT * FROM read_csv('${filePathName}', header = true, all_varchar = true);`);

        const reader = await this.fileIOService.duckDbConn.runAndReadAll(`SELECT * FROM ${tmpTableName};`);
        const rows = reader.getRowObjects() as any[];

        await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tmpTableName};`);

        const dtos: CreateViewElementDto[] = rows.map(row => ({
            id: parseInt(row[ElementImportTransformer.ID_PROPERTY], 10),
            abbreviation: row[ElementImportTransformer.ABBREVIATION_PROPERTY],
            name: row[ElementImportTransformer.NAME_PROPERTY],
            description: row[ElementImportTransformer.DESCRIPTION_PROPERTY] || null,
            units: row[ElementImportTransformer.UNITS_PROPERTY] || '',
            typeId: row[ElementImportTransformer.TYPE_ID_PROPERTY] ? parseInt(row[ElementImportTransformer.TYPE_ID_PROPERTY], 10) : 0,
            entryScaleFactor: row[ElementImportTransformer.ENTRY_SCALE_FACTOR_PROPERTY] ? parseFloat(row[ElementImportTransformer.ENTRY_SCALE_FACTOR_PROPERTY]) : null,
            comment: row[ElementImportTransformer.COMMENT_PROPERTY] || null,
        }));

        await this.elementsService.bulkPut(dtos, userId);
    }

    // ─── Session Management ──────────────────────────────────

    public async destroySession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            const tableName: string = DuckDBUtils.getTableNameFromFileName(session.fileName);
            await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tableName};`);
        } catch (e) {
            this.logger.warn(`Could not drop metadata preview table ${session.fileName}: ${e}`);
        }

        try {
            const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
            this.fileIOService.deleteFile(importFilePathName);
        } catch (e) {
            this.logger.warn(`Could not delete metadata preview file ${session.fileName}: ${e}`);
        }

        this.sessions.delete(sessionId);
    }

    public getSession(sessionId: string): PreviewSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new NotFoundException(`Preview session not found: ${sessionId}. It may have expired.`);
        }
        return session;
    }

    // ─── Helper Methods ──────────────────────────────────────


    private async getColumnNames(tableName: string): Promise<string[]> {
        const reader = await this.fileIOService.duckDbConn.runAndReadAll(`DESCRIBE ${tableName}`);
        return reader.getRowObjects().map((item: any) => item.column_name);
    }

    private async getTotalRowCount(tableName: string): Promise<number> {
        const reader = await this.fileIOService.duckDbConn.runAndReadAll(`SELECT COUNT(*)::INTEGER AS cnt FROM ${tableName}`);
        const rows = reader.getRowObjects();
        return Number(rows[0]?.cnt ?? 0);
    }

    private async getPreviewRows(tableName: string, limit: number): Promise<string[][]> {
        const reader = await this.fileIOService.duckDbConn.runAndReadAll(`SELECT * FROM ${tableName} LIMIT ${limit}`);
        return this.convertTableDataToPreviewRows(reader.getRowObjects());
    }

    private async getSkippedData(importFilePathName: string, rowsToSkip: number, delimiter?: string): Promise<PreviewTableData> {
        const skippedData: PreviewTableData = { totalRowCount: 0, columns: [], rows: [] };

        if (rowsToSkip <= 0) return skippedData;

        const tableName: string = `${DuckDBUtils.getTableNameFromFileName(importFilePathName)}_skipped_data`;
        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, 0, rowsToSkip, delimiter);

        skippedData.totalRowCount = await this.getTotalRowCount(tableName);
        skippedData.columns = await this.getColumnNames(tableName);
        skippedData.rows = await this.getPreviewRows(tableName, this.MAX_PREVIEW_ROWS);

        return skippedData;
    }

    private convertTableDataToPreviewRows(tableData: any[]): string[][] {
        if (tableData.length === 0) return [];

        const keys = Object.keys(tableData[0]);
        return tableData.map((row: any) => keys.map(key => {
            const val = row[key];
            return val === null || val === undefined ? '' : String(val);
        }));
    }
}
