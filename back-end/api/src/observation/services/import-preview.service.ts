import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { TabularImportTransformer } from './tabular-import-transformer';
import { PreviewError,  PreviewForImportDto,  PreviewTableData, RawPreviewResponse, TransformedPreviewResponse } from '../dtos/import-preview.dto';
import { CreateSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/create-source-specification.dto';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { ObservationImportService } from './observations-import.service';

export interface PreviewSession {
    sessionId: string;
    fileName: string;
    rowsToSkip: number;
    delimiter?: string;
    createdAt: number;
    lastAccessedAt: number;
}

@Injectable()
export class ImportPreviewService implements OnModuleDestroy {
    private readonly logger: Logger = new Logger(ImportPreviewService.name);
    private readonly sessions: Map<string, PreviewSession> = new Map();
    private readonly MAX_PREVIEW_ROWS = 200;
    private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

    constructor(
        private fileIOService: FileIOService,
        private observationImportService: ObservationImportService,
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
                this.logger.log(`Cleaning up stale preview session: ${sessionId}`);
                await this.destroySession(sessionId);
            }
        }
    }

    public async initAndPreviewRawData(fileorFileName: string | Express.Multer.File, rowsToSkip: number, delimiter?: string): Promise<RawPreviewResponse> {
        const sessionId = crypto.randomUUID();
        const timestamp = Date.now();
        let importFilePathName: string;

        if (typeof fileorFileName === 'string') {
            try {
                // Check if file exists
                importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, path.basename(fileorFileName));
                await fs.promises.access(importFilePathName, fs.constants.R_OK);
            } catch (error) {
                throw new NotFoundException(`File not found for preview: ${fileorFileName}`);
            }
        } else {
            // Save file from memory to disk for processing.
            const ext = path.extname(fileorFileName.originalname);
            importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, `preview_${sessionId.substring(0, 8)}_${timestamp}${ext}`);
            await fs.promises.writeFile(importFilePathName, fileorFileName.buffer);
        }

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

    public async previewTransformedData(sessionId: string, sourceDef: CreateSourceSpecificationDto, stationId?: string): Promise<TransformedPreviewResponse> {
        const session = this.getSession(sessionId);
        session.lastAccessedAt = Date.now();

        // Reset table to raw state for idempotent processing
        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
        const tableName: string = DuckDBUtils.getTableNameFromFileName(importFilePathName);
        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, session.rowsToSkip, 0, session.delimiter);

        // Apply transformations based on the source definition.
        const elements: CreateViewElementDto[] = this.elementsService.find();
        const error: PreviewError | void = await TabularImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, 0, sourceDef, elements, 0, stationId);

        // Return the current table state (includes all successful transformations) 
        const previewData: PreviewTableData = {
            columns: await this.getColumnNames(tableName),
            rows: await this.getPreviewRows(tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await this.getTotalRowCount(tableName),
        };

        return { previewData, error: error ? error : undefined };
    }

    public async importData(sessionId: string, dto: PreviewForImportDto, userId: number): Promise<void> {
        const session = this.getSession(sessionId);

        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
        const processedFilePathName: string = await this.observationImportService.processFileForImport(dto.sourceId, importFilePathName, userId, dto.stationId);

        await this.observationImportService.importProcessedFileToDatabase(processedFilePathName);
    }

    public async destroySession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            const tableName: string = DuckDBUtils.getTableNameFromFileName(session.fileName);
            await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tableName};`);
        } catch (e) {
            this.logger.warn(`Could not drop preview table ${session.fileName}: ${e}`);
        }

        // Files are NOT deleted here — they may be referenced by saved specifications.
        // Orphaned files are cleaned up by the CleanupSchedulerService.

        this.sessions.delete(sessionId);
    }

    public getSession(sessionId: string): PreviewSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new NotFoundException(`Preview session not found: ${sessionId}. It may have expired.`);
        }
        return session;
    }

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