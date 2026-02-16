import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { ImportSqlBuilder } from './import-sql-builder';
import { ImportSourceTabularParamsDto } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { ImportSourceDto, DataStructureTypeEnum } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { PreviewError, PreviewWarning, RawPreviewResponse, StepPreviewResponse } from '../dtos/import-preview.dto';
import { CreateSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/create-source-specification.dto';
import { TableData } from 'duckdb-async';

interface PreviewSession {
    sessionId: string;
    uploadedFilePath: string;
    tableName: string;
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

    public async initAndPreviewFile(file: string | Express.Multer.File, rowsToSkip: number, delimiter?: string): Promise<RawPreviewResponse> {
        const sessionId = crypto.randomUUID();
        const timestamp = Date.now();
        let uploadedFilePath: string;

        if (typeof file !== 'string') {
            const ext = path.extname(file.originalname);
            uploadedFilePath = path.posix.join(this.fileIOService.apiImportsDir, `preview_${sessionId.substring(0, 8)}_${timestamp}${ext}`);
            // Save file to disk
            await fs.promises.writeFile(uploadedFilePath, file.buffer);

        } else {
            uploadedFilePath = path.posix.join(this.fileIOService.apiImportsDir, path.basename(file));
            // Check if file exists
            try {
                await fs.promises.access(uploadedFilePath, fs.constants.R_OK);
            } catch {
                throw new NotFoundException(`Sample file not found: ${file}`);
            }
        }

        // Create a valid SQL identifier from the session ID. Note uuid v4 contains hyphens which are not allowed in SQL identifiers, so we remove them.
        const tableName = `preview_${sessionId.substring(0, 8).replaceAll('-', '')}_${timestamp}`;

        const session: PreviewSession = {
            sessionId,
            uploadedFilePath,
            tableName,
            rowsToSkip,
            delimiter,
            createdAt: timestamp,
            lastAccessedAt: timestamp,
        };
        this.sessions.set(sessionId, session);

        // Load raw data into DuckDB
        await this.loadRawTable(session);

        // Get preview data
        const columns = await this.getColumnNames(tableName);
        const totalRowCount = await this.getRowCount(tableName);
        const previewRows = await this.getPreviewRows(tableName, this.DISPLAY_ROWS);
        const skippedRows = await this.getSkippedRows(session);
        const sampleFile = path.basename(uploadedFilePath);

        return { sessionId, sampleFile, columns, totalRowCount, previewRows, skippedRows };
    }


    public async updateBaseParams(sessionId: string, rowsToSkip: number, delimiter?: string): Promise<RawPreviewResponse> {
        const session = this.getSession(sessionId);
        session.rowsToSkip = rowsToSkip;
        session.delimiter = delimiter;
        session.lastAccessedAt = Date.now();

        // Reload with new params
        await this.loadRawTable(session);

        const columns = await this.getColumnNames(session.tableName);
        const totalRowCount = await this.getRowCount(session.tableName);
        const previewRows = await this.getPreviewRows(session.tableName, this.DISPLAY_ROWS);
        const skippedRows = await this.getSkippedRows(session);
        const sampleFile = path.basename(session.uploadedFilePath);

        return { sessionId, sampleFile, columns, totalRowCount, previewRows, skippedRows };
    }

    public async previewStep(sessionId: string, sourceDef: CreateSourceSpecificationDto, stationId?: string): Promise<StepPreviewResponse> {
        const session = this.getSession(sessionId);
        session.lastAccessedAt = Date.now();

        const warnings: PreviewWarning[] = [];
        const errors: PreviewError[] = [];

        // Reset table to raw state for idempotent processing
        await this.loadRawTable(session);
        const beforeCount = await this.getRowCount(session.tableName);

        const importDef = sourceDef.parameters as ImportSourceDto;
        if (!importDef || importDef.dataStructureType !== DataStructureTypeEnum.TABULAR) {
            errors.push({
                type: 'MISSING_REQUIRED_FIELD',
                message: 'Only tabular data structure is supported for preview.',
            });
            const columns = await this.getColumnNames(session.tableName);
            const previewRows = await this.getPreviewRows(session.tableName, this.DISPLAY_ROWS);
            return { columns, previewRows, totalRowCount: beforeCount, rowsDropped: 0, warnings, errors };
        }

        const tabularDef = importDef.dataStructureParameters as ImportSourceTabularParamsDto;
        if (!tabularDef) {
            errors.push({
                type: 'MISSING_REQUIRED_FIELD',
                message: 'Tabular data structure parameters are not defined.',
            });
            const columns = await this.getColumnNames(session.tableName);
            const previewRows = await this.getPreviewRows(session.tableName, this.DISPLAY_ROWS);
            return { columns, previewRows, totalRowCount: beforeCount, rowsDropped: 0, warnings, errors };
        }

        // Execute each transformation step individually.
        // Each step's SQL is built and executed separately so that:
        // 1. If a step fails, previous successful transformations remain visible in the preview
        // 2. The error message tells the user exactly which step failed
        // 3. The user can see partial progress and fix only what's broken

        const steps: { name: string; buildSql: () => string }[] = [
            { name: 'Station', buildSql: () => ImportSqlBuilder.buildAlterStationColumnSQL(tabularDef, session.tableName, stationId) },
            { name: 'Element', buildSql: () => ImportSqlBuilder.buildAlterElementColumnSQL(tabularDef, session.tableName) },
            { name: 'Date/Time', buildSql: () => ImportSqlBuilder.buildAlterDateTimeColumnSQL(sourceDef, tabularDef, session.tableName) },
            { name: 'Value & Flag', buildSql: () => ImportSqlBuilder.buildAlterValueColumnSQL(sourceDef, importDef, tabularDef, session.tableName) },
            { name: 'Level', buildSql: () => ImportSqlBuilder.buildAlterLevelColumnSQL(tabularDef, session.tableName) },
            { name: 'Interval', buildSql: () => ImportSqlBuilder.buildAlterIntervalColumnSQL(tabularDef, session.tableName) },
            { name: 'Comment', buildSql: () => ImportSqlBuilder.buildAlterCommentColumnSQL(tabularDef, session.tableName) },
            {
                name: 'Finalize',
                buildSql: () => {
                    let sql = '';
                    sql += `ALTER TABLE ${session.tableName} ADD COLUMN ${ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME} INTEGER DEFAULT 0;`;
                    sql += `ALTER TABLE ${session.tableName} ADD COLUMN ${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME} INTEGER DEFAULT 0;`;
                    sql += ImportSqlBuilder.buildRemoveDuplicatesSQL(session.tableName);
                    return sql;
                }
            },
        ];

        for (const step of steps) {
            try {
                // Build the SQL — this can throw if the config is invalid (e.g. missing required fields)
                const sql = step.buildSql();
                if (sql) {
                    await this.fileIOService.duckDb.exec(sql);
                }
            } catch (error) {
                const classifiedError = this.classifyDuckDbError(error, step.name);
                errors.push(classifiedError);
                // Stop processing — later steps may depend on this one
                break;
            }
        }

        // Return the current table state (includes all successful transformations)
        const afterCount = await this.getRowCount(session.tableName);
        const columns = await this.getColumnNames(session.tableName);
        const previewRows = await this.getPreviewRows(session.tableName, this.DISPLAY_ROWS);
        const rowsDropped = beforeCount - afterCount;

        // Detect warnings on whatever columns exist so far
        await this.detectWarnings(session.tableName, columns, warnings);

        if (rowsDropped > 0) {
            warnings.push({
                type: 'NULL_VALUES',
                message: `${rowsDropped} row(s) were removed during processing (due to NULL values, missing value handling, or invalid dates).`,
                affectedRowCount: rowsDropped,
            });
        }

        return { columns, previewRows, totalRowCount: afterCount, rowsDropped, warnings, errors };
    }

    public async destroySession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            await this.fileIOService.duckDb.run(`DROP TABLE IF EXISTS ${session.tableName};`);
        } catch (e) {
            this.logger.warn(`Could not drop preview table ${session.tableName}: ${e}`);
        }

        // DO NOT DELETE THE UPLOADED FILES IMMEDIATELY AFTER EACH SESSION ENDS BECAUSE:
        // The file is needed for future previews

        // try {
        //     await fs.promises.unlink(session.uploadedFilePath);
        // } catch (e) {
        //     this.logger.warn(`Could not delete preview file ${session.uploadedFilePath}: ${e}`);
        // }

        this.sessions.delete(sessionId);
    }

    private getSession(sessionId: string): PreviewSession {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new NotFoundException(`Preview session not found: ${sessionId}. It may have expired.`);
        }
        return session;
    }

    private async loadRawTable(session: PreviewSession): Promise<void> {
        // Drop existing table
        await this.fileIOService.duckDb.run(`DROP TABLE IF EXISTS ${session.tableName};`);

        // Read CSV with the configured params
        const importParams = ImportSqlBuilder.buildCsvImportParams(session.rowsToSkip, session.delimiter);
        const createSQL = `CREATE OR REPLACE TABLE ${session.tableName} AS SELECT * FROM read_csv('${session.uploadedFilePath}', ${importParams.join(', ')}) LIMIT ${this.MAX_PREVIEW_ROWS};`;

        await this.fileIOService.duckDb.run(createSQL);

        // Rename columns to normalized names (column0, column1, ...)
        const renameSQL = await DuckDBUtils.getRenameDefaultColumnNamesSQL(this.fileIOService.duckDb, session.tableName);
        if (renameSQL) {
            await this.fileIOService.duckDb.exec(renameSQL);
        }
    }

    private async getSkippedRows(session: PreviewSession): Promise<string[][]> {
        if (session.rowsToSkip <= 0) return [];

        const importParams = ImportSqlBuilder.buildCsvImportParams(0, session.delimiter);
        const rows = await this.fileIOService.duckDb.all(
            `SELECT * FROM read_csv('${session.uploadedFilePath}', ${importParams.join(', ')}) LIMIT ${session.rowsToSkip}`
        );

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

    private async detectWarnings(tableName: string, columns: string[], warnings: PreviewWarning[]): Promise<void> {
        // Check for NULL values in key columns
        const keyColumns = [
            ImportSqlBuilder.STATION_ID_PROPERTY_NAME,
            ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME,
            ImportSqlBuilder.DATE_TIME_PROPERTY_NAME,
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
            ImportSqlBuilder.STATION_ID_PROPERTY_NAME,
            ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME,
            ImportSqlBuilder.LEVEL_PROPERTY_NAME,
            ImportSqlBuilder.DATE_TIME_PROPERTY_NAME,
            ImportSqlBuilder.INTERVAL_PROPERTY_NAME,
            ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME,
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
    }

    private classifyDuckDbError(error: unknown, stepName: string): PreviewError {
        const msg = error instanceof Error ? error.message : String(error);

        if (msg.includes('does not have a column named') || msg.includes('Referenced column') || msg.includes('not found in FROM clause')) {
            return {
                type: 'COLUMN_NOT_FOUND',
                message: `${stepName}: A column referenced in the specification was not found in the uploaded file. Check that the column positions are correct.`,
                detail: msg,
            };
        }

        if (msg.includes('out of range') || msg.includes('Binder Error')) {
            return {
                type: 'INVALID_COLUMN_POSITION',
                message: `${stepName}: A column position is out of range. The file has fewer columns than expected.`,
                detail: msg,
            };
        }

        return {
            type: 'SQL_EXECUTION_ERROR',
            message: `${stepName}: An error occurred while processing the file with the current specification.`,
            detail: msg,
        };
    }

}
