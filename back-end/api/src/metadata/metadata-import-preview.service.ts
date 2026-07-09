import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';
import { DuckDBUtils, getTableNameFromUUID } from 'src/shared/utils/duckdb.utils';
import { StationImportTransformer } from './stations/services/station-import-transformer';
import { ElementImportTransformer } from './elements/services/element-import-transformer';
import {
    StationColumnMappingDto,
    ElementColumnMappingDto,
} from './metadata-import-preview.dto';
import { PreviewTableData, RawPreviewResponse, TransformedPreviewResponse } from 'src/observation/dtos/import-preview.dto';
import { FileLinesUtils } from 'src/shared/utils/file-lines.utils';
import { StationsImportExportService } from './stations/services/stations-import-export.service';
import { ElementsImportExportService } from './elements/services/elements-import-export.service';
import { ImportErrorUtils } from 'src/shared/utils/import-error.utils';
import { FileProcessingError } from './file-processing-error.model';

interface PreviewSession {
    sessionId: string;
    operationId: crypto.UUID;
    fileName: string;
    rowsToSkip: number;
    delimiter?: string;
    createdAt: number;
    lastAccessedAt: number;
}

@Injectable()
export class MetadataImportPreviewService implements OnModuleDestroy {
    private readonly logger: Logger = new Logger(MetadataImportPreviewService.name);
    private readonly sessions: Map<string, PreviewSession> = new Map();
    private readonly MAX_PREVIEW_ROWS = 200;
    private readonly SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes

    constructor(
        private fileIOService: FileIOService,
        private stationsImportExportService: StationsImportExportService,
        private elementsImportExportService: ElementsImportExportService,
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
                this.logger.log(`Cleaning up stale metadata preview session: ${sessionId}`);
                await this.destroySession(sessionId);
            }
        }
    }

    // ─── Upload & Raw Preview ────────────────────────────────

    public async initAndPreviewRawData(file: Express.Multer.File, rowsToSkip: number, delimiter?: string): Promise<RawPreviewResponse> {
        const op: OperationContext = await this.fileIOService.createOperation();
        const sessionId: string = op.operationId;
        const timestamp = Date.now();

        // Note. Original file could be used here but to stay consistent with the import preview, we are saving the file with the name of the created operational id
        const fileName: string = `${op.operationId}${path.extname(file.originalname)}`;
        await fs.promises.writeFile(path.posix.join(op.inputDir, fileName), file.buffer);

        const session: PreviewSession = {
            sessionId,
            operationId: op.operationId,
            fileName,
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

        return this.previewRawData(session);
    }

    public async previewRawData(session: PreviewSession): Promise<RawPreviewResponse> {
        // Load the whole file into DuckDB (resets to raw state for idempotent preview)
        const op: OperationContext = this.fileIOService.getOperationContext(session.operationId);
        const importFilePathName: string = path.posix.join(op.inputDir, session.fileName);
        const tableName: string = getTableNameFromUUID(crypto.randomUUID());

        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, false, session.rowsToSkip, 0, session.delimiter);

        // Get preview data
        const previewData: PreviewTableData = {
            columns: await DuckDBUtils.getColumnNames(this.fileIOService.duckDbConn, tableName),
            rows: await DuckDBUtils.getPreviewRows(this.fileIOService.duckDbConn, tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await DuckDBUtils.getPreviewRowCount(this.fileIOService.duckDbConn, tableName),
        };
        const skippedData: PreviewTableData = await DuckDBUtils.getSkippedData(this.fileIOService, importFilePathName, session.rowsToSkip, this.MAX_PREVIEW_ROWS, session.delimiter);

        await this.fileIOService.duckDbConn.run(`DROP TABLE ${tableName};`);

        const originalLines: string[] = await FileLinesUtils.readHeadLines(importFilePathName, session.rowsToSkip + this.MAX_PREVIEW_ROWS);

        return { sessionId: session.sessionId, fileName: session.fileName, previewData, skippedData, originalLines };
    }

    // ─── Station Transform & Preview ─────────────────────────

    public async previewTransformedStationData(sessionId: string, stnMapping: StationColumnMappingDto): Promise<TransformedPreviewResponse> {
        const session: PreviewSession = this.getSession(sessionId);
        const op: OperationContext = this.fileIOService.getOperationContext(session.operationId);
        const importFilePathName = path.posix.join(op.inputDir, session.fileName);
        const tableName: string = getTableNameFromUUID(crypto.randomUUID());

        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, false, session.rowsToSkip, 0, session.delimiter);

        const error: FileProcessingError | void = await StationImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, stnMapping);

        // Return the current table state (includes all successful transformations) 
        const previewData: PreviewTableData = {
            columns: await DuckDBUtils.getColumnNames(this.fileIOService.duckDbConn, tableName),
            rows: await DuckDBUtils.getPreviewRows(this.fileIOService.duckDbConn, tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await DuckDBUtils.getPreviewRowCount(this.fileIOService.duckDbConn, tableName),
        };

        await this.fileIOService.duckDbConn.run(`DROP TABLE ${tableName};`);

        return { previewData, error: error || undefined };

    }

    public async importStationData(sessionId: string, stnMapping: StationColumnMappingDto, userId: number): Promise<void> {
        const session: PreviewSession = this.getSession(sessionId);
        const op: OperationContext = this.fileIOService.getOperationContext(session.operationId);
        const importFilePathName = path.posix.join(op.inputDir, session.fileName);
        const tableName: string = getTableNameFromUUID(crypto.randomUUID());

        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, false, session.rowsToSkip, 0, session.delimiter);

        const error: FileProcessingError | void = await StationImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, stnMapping, userId);
        if (error) {
            throw new BadRequestException(`Station import transformation failed at step "${error.message}"`);
        }

        const processedFileName: string = `${crypto.randomUUID()}.csv`;

        // Export to CSV
        await StationImportTransformer.exportTransformedDataToFile(this.fileIOService.duckDbConn, tableName, path.posix.join(op.intermediateDir, processedFileName));

        await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tableName};`);

        // Import to PostgreSQL
        try {
            await this.stationsImportExportService.importProcessedFileToDatabase(path.posix.join(op.dbIntermediateDir, processedFileName));
        } catch (dbError) {
            const classified = ImportErrorUtils.classifyPostgresError(dbError);
            throw new BadRequestException(classified.message);
        }
    }

    // ─── Element Transform & Preview ─────────────────────────

    public async previewTransformedElementsData(sessionId: string, elementMapping: ElementColumnMappingDto): Promise<TransformedPreviewResponse> {
        const session = this.getSession(sessionId);
        const op = this.fileIOService.getOperationContext(session.operationId);
        const importFilePathName = path.posix.join(op.inputDir, session.fileName);
        const tableName: string = getTableNameFromUUID(crypto.randomUUID());

        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, false, session.rowsToSkip, 0, session.delimiter);

        const error: FileProcessingError | void = await ElementImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, elementMapping);

        // Return the current table state (includes all successful transformations) 
        const previewData: PreviewTableData = {
            columns: await DuckDBUtils.getColumnNames(this.fileIOService.duckDbConn, tableName),
            rows: await DuckDBUtils.getPreviewRows(this.fileIOService.duckDbConn, tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await DuckDBUtils.getPreviewRowCount(this.fileIOService.duckDbConn, tableName),
        };

        await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tableName};`);

        return { previewData, error: error || undefined };
    }

    public async importElementsData(sessionId: string, elementMapping: ElementColumnMappingDto, userId: number): Promise<void> {
        const session = this.getSession(sessionId);
        const op = this.fileIOService.getOperationContext(session.operationId);
        const importFilePathName = path.posix.join(op.inputDir, session.fileName);
        const tableName: string = getTableNameFromUUID(crypto.randomUUID());

        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, false, session.rowsToSkip, 0, session.delimiter);

        const error: FileProcessingError | void = await ElementImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, elementMapping, userId);
        if (error) {
            throw new BadRequestException(`Element import transformation failed at step "${error.message}"`);
        }

        const processedFileName: string = `${crypto.randomUUID()}.csv`;

        // Export to CSV
        await ElementImportTransformer.exportTransformedDataToFile(this.fileIOService.duckDbConn, tableName, path.posix.join(op.intermediateDir, processedFileName));

        await this.fileIOService.duckDbConn.run(`DROP TABLE IF EXISTS ${tableName};`);

        // Import to PostgreSQL
        try {
            await this.elementsImportExportService.importProcessedFileToDatabase(path.posix.join(op.dbIntermediateDir, processedFileName));
        } catch (dbError) {
            const classified = ImportErrorUtils.classifyPostgresError(dbError);
            throw new BadRequestException(classified.message);
        }
    }

    // ─── Session Management ──────────────────────────────────

    public async destroySession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            this.logger.warn(`${sessionId} not found`);
            return;
        };

        await this.fileIOService.deleteOperation(session.operationId);

        this.sessions.delete(sessionId);
    }

    public getSession(sessionId: string): PreviewSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new NotFoundException(`Preview session not found: ${sessionId}. It may have expired.`);
        }
        session.lastAccessedAt = Date.now();

        return session;
    }

}
