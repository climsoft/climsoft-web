import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { TabularImportTransformer } from './tabular-import-transformer';
import { PreviewError, PreviewWarning, RawPreviewResponse, StepPreviewResponse } from '../dtos/import-preview.dto';
import { CreateSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/create-source-specification.dto';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { TableData } from 'duckdb-async';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';

interface PreviewSession {
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
    private readonly MAX_PREVIEW_ROWS = 1000;
    private readonly DISPLAY_ROWS = 200;
    private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

    constructor(
        private fileIOService: FileIOService,
        private sourcesService: SourceSpecificationsService,
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

    @Cron('0 2 * * *')
    public async cleanupOrphanedPreviewFiles(): Promise<void> {
        try {
            this.logger.log('Running orphaned preview file cleanup task');
            const importsDir = this.fileIOService.apiImportsDir;

            const allFiles: string[] = await fs.promises.readdir(importsDir);
            const previewFiles = allFiles.filter(f => f.startsWith('preview_'));

            if (previewFiles.length === 0) return;

            // Get all sample files referenced by saved specifications
            const referencedFiles = await this.sourcesService.findAllReferencedSampleFiles();

            // Collect files from active sessions (still in use)
            const activeSessionFiles = new Set<string>();
            for (const session of this.sessions.values()) {
                activeSessionFiles.add(path.basename(session.fileName));
            }

            // Delete orphaned files
            let deletedCount = 0;
            for (const file of previewFiles) {
                if (!referencedFiles.has(file) && !activeSessionFiles.has(file)) {
                    try {
                        await fs.promises.unlink(path.posix.join(importsDir, file));
                        deletedCount++;
                    } catch (e) {
                        this.logger.warn(`Could not delete orphaned preview file ${file}: ${e}`);
                    }
                }
            }

            if (deletedCount > 0) {
                this.logger.log(`Cleaned up ${deletedCount} orphaned preview file(s)`);
            }

            this.logger.log('Orphaned preview file cleanup task completed');

        } catch (e) {
            this.logger.warn(`Error during orphaned file cleanup: ${e}`);
        }
    }

    public async initAndPreviewRawFile(fileorFileName: string | Express.Multer.File, rowsToSkip: number, delimiter?: string): Promise<RawPreviewResponse> {
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

        return this.previewRawFile(session);
    }


    public async updateBaseParamsAndPreviewRawFile(sessionId: string, rowsToSkip: number, delimiter?: string): Promise<RawPreviewResponse> {
        const session = this.getSession(sessionId);
        session.rowsToSkip = rowsToSkip;
        session.delimiter = delimiter;
        session.lastAccessedAt = Date.now();

        return this.previewRawFile(session);
    }

    public async previewRawFile(session: PreviewSession): Promise<RawPreviewResponse> {
        // Load the file into DuckDB (resets to raw state for idempotent preview)
        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName);
        const tableName: string = await TabularImportTransformer.loadTableFromFile(this.fileIOService.duckDb, importFilePathName, session.rowsToSkip, this.MAX_PREVIEW_ROWS, session.delimiter);

        // Get preview data
        const columns = await this.getColumnNames(tableName);
        const totalRowCount = await this.getRowCount(tableName);
        const previewRows = await this.getPreviewRows(tableName, this.DISPLAY_ROWS);
        const skippedRows = await this.getSkippedRows(importFilePathName, session.rowsToSkip, session.delimiter);

        return { sessionId: session.sessionId, fileName: session.fileName, columns, totalRowCount, previewRows, skippedRows };
    }

    public async transformAndPreviewFile(sessionId: string, sourceDef: CreateSourceSpecificationDto, stationId?: string): Promise<StepPreviewResponse> {
        const session = this.getSession(sessionId);
        session.lastAccessedAt = Date.now();

        // Reset table to raw state for idempotent processing 
        const importFilePathName = path.posix.join(this.fileIOService.apiImportsDir, session.fileName); 
        const tableName: string = await TabularImportTransformer.loadTableFromFile(this.fileIOService.duckDb, importFilePathName, session.rowsToSkip, this.MAX_PREVIEW_ROWS, session.delimiter);

        const beforeCount: number = await this.getRowCount(tableName);

        // TODO. Will come from cache in later iterations
        const elements: CreateViewElementDto[] = await this.elementsService.find();

        // Apply transformations based on the source definition. 
        const error: PreviewError | void = await TabularImportTransformer.executeTransformation(this.fileIOService.duckDb, tableName, 0, sourceDef, elements, 0, stationId);

        // Return the current table state (includes all successful transformations)
        const afterCount = await this.getRowCount(tableName);
        const columns = await this.getColumnNames(tableName);
        const previewRows = await this.getPreviewRows(tableName, this.DISPLAY_ROWS);
        const rowsDropped = beforeCount - afterCount;
        const warnings: PreviewWarning[] = await this.detectWarnings(tableName, columns);// Detect warnings on whatever columns exist so far

        if (rowsDropped > 0) {
            warnings.push({
                type: 'NULL_VALUES',
                message: `${rowsDropped} row(s) were removed during processing (due to NULL values, missing value handling, or invalid dates).`,
                affectedRowCount: rowsDropped,
            });
        }

        return { columns, previewRows, totalRowCount: afterCount, rowsDropped, warnings, error: error ? error : undefined };
    }


    public async destroySession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            const tableName: string = DuckDBUtils.getTableNameFromFileName(session.fileName);
            await this.fileIOService.duckDb.run(`DROP TABLE IF EXISTS ${tableName};`);
        } catch (e) {
            this.logger.warn(`Could not drop preview table ${session.fileName}: ${e}`);
        }

        // Files are NOT deleted here — they may be referenced by saved specifications.
        // Orphaned files are cleaned up by the daily `cleanupOrphanedPreviewFiles()` job.

        this.sessions.delete(sessionId);
    }

    public getSession(sessionId: string): PreviewSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new NotFoundException(`Preview session not found: ${sessionId}. It may have expired.`);
        }
        return session;
    }


    private async getSkippedRows(importFilePathName: string, rowsToSkip: number, delimiter?: string): Promise<string[][]> {
        if (rowsToSkip <= 0) return [];

        const importParams = DuckDBUtils.buildCsvImportParams(0, delimiter);
        const rows = await this.fileIOService.duckDb.all(`SELECT * FROM read_csv('${importFilePathName}', ${importParams.join(', ')}) LIMIT ${rowsToSkip}`);

        return this.convertTableDataToPreviewRows(rows);
    }

    private async getColumnNames(tableName: string): Promise<string[]> {
        const result = await this.fileIOService.duckDb.all(`DESCRIBE ${tableName}`);
        return result.map(item => item.column_name);
    }

    private async getRowCount(tableName: string): Promise<number> {
        const result = await this.fileIOService.duckDb.all(`SELECT COUNT(*)::INTEGER AS cnt FROM ${tableName}`);
        return result[0]?.cnt ?? 0;
    }

    private async getPreviewRows(tableName: string, limit: number): Promise<string[][]> {
        const rows = await this.fileIOService.duckDb.all(`SELECT * FROM ${tableName} LIMIT ${limit}`);
        return this.convertTableDataToPreviewRows(rows);
    }

    private convertTableDataToPreviewRows(tableData: TableData): string[][] {
        if (tableData.length === 0) return [];

        const keys = Object.keys(tableData[0]);
        return tableData.map(row => keys.map(key => {
            const val = row[key];
            return val === null || val === undefined ? '' : String(val);
        }));
    }

    private async detectWarnings(tableName: string, columns: string[]): Promise<PreviewWarning[]> {
        const warnings: PreviewWarning[] = [];
        // Check for NULL values in key columns
        const keyColumns = [
            TabularImportTransformer.STATION_ID_PROPERTY_NAME,
            TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME,
            TabularImportTransformer.LEVEL_PROPERTY_NAME,
            TabularImportTransformer.DATE_TIME_PROPERTY_NAME,
            TabularImportTransformer.INTERVAL_PROPERTY_NAME,

        ];

        for (const col of keyColumns) {
            if (columns.includes(col)) {
                try {
                    const result = await this.fileIOService.duckDb.all(
                        `SELECT COUNT(*)::INTEGER AS cnt FROM ${tableName} WHERE ${col} IS NULL`
                    );
                    const nullCount = result[0]?.cnt ?? 0;
                    if (nullCount > 0) {
                        warnings.push({
                            type: 'NULL_VALUES',
                            message: `${nullCount} row(s) have NULL values in the '${col}' column.`,
                            affectedRowCount: nullCount,
                        });
                    }
                } catch {
                    // Column might not exist yet, skip
                }
            }
        }

        // Check for duplicates on composite key
        const compositeKeyCols = [
            TabularImportTransformer.STATION_ID_PROPERTY_NAME,
            TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME,
            TabularImportTransformer.LEVEL_PROPERTY_NAME,
            TabularImportTransformer.DATE_TIME_PROPERTY_NAME,
            TabularImportTransformer.INTERVAL_PROPERTY_NAME,
            TabularImportTransformer.SOURCE_ID_PROPERTY_NAME,
        ];

        if (compositeKeyCols.every(col => columns.includes(col))) {
            try {
                const result = await this.fileIOService.duckDb.all(
                    `SELECT COUNT(*)::INTEGER AS cnt FROM (
                        SELECT ${compositeKeyCols.join(', ')}, COUNT(*) AS dup_count
                        FROM ${tableName}
                        GROUP BY ${compositeKeyCols.join(', ')}
                        HAVING COUNT(*) > 1
                    )`
                );
                const dupGroupCount = result[0]?.cnt ?? 0;
                if (dupGroupCount > 0) {
                    warnings.push({
                        type: 'DUPLICATE_ROWS',
                        message: `${dupGroupCount} group(s) of duplicate rows found based on the composite key. Only the last occurrence of each duplicate will be kept.`,
                        affectedRowCount: dupGroupCount,
                    });
                }
            } catch {
                // Columns might not all exist yet, skip
            }
        }

        return warnings;
    }

}
