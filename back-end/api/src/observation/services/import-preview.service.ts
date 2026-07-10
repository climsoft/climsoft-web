import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileIOService, OperationContext } from 'src/shared/services/file-io.service';
import { AdapterRunnerService, AdapterRef, AdapterRunMetadata, AdapterRunResult } from 'src/shared/services/adapter-runner.service';
import { TabularImportTransformer } from './tabular-import-transformer';
import { BaseParamsDto, PreviewForImportDto, PreviewForSourceResponse, PreviewTableData, RawPreviewResponse, TransformedPreviewResponse } from '../dtos/import-preview.dto';
import { FileLinesUtils } from 'src/shared/utils/file-lines.utils';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/create-view-element.dto';
import { DuckDBUtils, getTableNameFromUUID } from 'src/shared/utils/duckdb.utils';
import { ObservationImportService } from './observations-import.service';
import { FlagsService } from 'src/metadata/flags/services/flags.service';
import { AdaptersService } from 'src/metadata/adapters/services/adapters.service';
import { ViewFlagDto } from 'src/metadata/flags/dtos/view-flag.dto';
import { ViewSourceSpecificationModel } from 'src/metadata/source-specifications/dtos/view-source-specification.model';
import { ViewAdapterSpecificationDto } from 'src/metadata/adapters/dtos/view-adapter-specification.dto';
import { FileProcessingError } from 'src/metadata/file-processing-error.model';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { ImportSourceTabularParamsDto } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';

interface PreviewSession {
    sessionId: string;
    operationId: crypto.UUID;
    /** The original uploaded file name — never changes after init. */
    originalFileName: string;
    /**
     * The basename of the "working file" the DuckDB preview operates on.
     * When no adapter is applied, same as originalFileName.
     * When an adapter is applied, this is the adapter's output file name.
     */
    workingFileName: string;
    /** Which operation directory the working file lives in. */
    fileLocation: 'input' | 'intermediate';
    rowsToSkip: number;
    delimiter: string | null;
    /** Currently applied adapter, or null if none. */
    importAdapterId: number | null;
    createdAt: number;
    lastAccessedAt: number;
}

@Injectable()
export class ImportPreviewService implements OnModuleDestroy {
    private readonly logger: Logger = new Logger(ImportPreviewService.name);
    private readonly sessions: Map<string, PreviewSession> = new Map();
    private readonly MAX_PREVIEW_ROWS = 200;
    private readonly SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes

    constructor(
        private fileIOService: FileIOService,
        private adapterRunnerService: AdapterRunnerService,
        private observationImportService: ObservationImportService,
        private elementsService: ElementsService,
        private flagsService: FlagsService,
        private adaptersService: AdaptersService,
        private sourcesService: SourceSpecificationsService,
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
                this.logger.log(`Cleaning up stale preview session: ${sessionId}`);
                await this.destroySession(sessionId);
            }
        }
    }

    public async initAndPreviewRawData(fileOrFileName: string | Express.Multer.File, dto: BaseParamsDto): Promise<RawPreviewResponse> {
        const op = await this.fileIOService.createOperation();
        const sessionId = op.operationId;
        const timestamp = Date.now();
        let fileName: string;

        if (typeof fileOrFileName === 'string') {
            // Existing file — resolve against the persistent samples directory.
            // This path is used when reopening a preview from a saved source spec sample file.
            // Note. It's important to retain the same file name because changes to sample file names are logged in the database.
            fileName = fileOrFileName;
            const samplesPath = path.posix.join(this.fileIOService.apiSamplesDir, fileName);
            try {
                await fs.promises.access(samplesPath, fs.constants.R_OK);
            } catch {
                throw new NotFoundException(`Sample file not found: ${fileName}`);
            }
            this.logger.log(`copying file from ${samplesPath} to ${op.inputDir}`);
            await fs.promises.copyFile(samplesPath, path.posix.join(op.inputDir, fileName));
        } else {
            // New upload — save from memory to the operation's input directory
            // For uploads, always use the new operation id as the original name because new "sample file" uploads need to be logged as changes.
            // The original file's extension is preserved so downstream readers (DuckDB sniffer, persisted sample file in /app/samples) see a real file type.
            // Note. Auto import doesn't need this because the downloaded file names will never be used as sample file names in that operation
            fileName = op.operationId + path.extname(fileOrFileName.originalname);
            this.logger.log(`writing uploaded file ${fileOrFileName.originalname} from memory to file: ${fileName}`);
            await fs.promises.writeFile(path.posix.join(op.inputDir, fileName), fileOrFileName.buffer);
        }

        const session: PreviewSession = {
            sessionId: sessionId,
            operationId: op.operationId,
            originalFileName: fileName,
            workingFileName: fileName, // By default, original file name is the working file name, exception being when there is an adpater
            fileLocation: 'input',
            rowsToSkip: dto.rowsToSkip,
            delimiter: dto.delimiter,
            importAdapterId: dto.importAdapterId,
            createdAt: timestamp,
            lastAccessedAt: timestamp,
        };

        this.sessions.set(sessionId, session);

        await this.applyAdapter(session, dto.importAdapterId);

        return this.previewRawData(session);
    }


    public async updateBaseParamsAndPreviewRawData(sessionId: string, dto: BaseParamsDto): Promise<RawPreviewResponse> {
        const session: PreviewSession = this.getSession(sessionId);
        session.rowsToSkip = dto.rowsToSkip;
        session.delimiter = dto.delimiter;

        if (session.importAdapterId === dto.importAdapterId) {
            return this.previewRawData(session);
        }

        await this.applyAdapter(session, dto.importAdapterId);

        return this.previewRawData(session);
    }

    /**
     * View-only preview of a spec's saved sample file. The session is torn
     * down server-side because the sample file is never confirmed for
     * import, so there is nothing for the client to retain.
     */
    public async previewSampleForSource(sourceId: number): Promise<PreviewForSourceResponse | null> {
        const sourceDef: ViewSourceSpecificationModel = this.sourcesService.find(sourceId);
        if (!sourceDef.sampleFileName) {
            return null;
        }
        // For sample previews we pass a placeholder station id when the spec
        // has no station column, matching the input-dialog's behavior.
        const importSource = sourceDef.parameters as ImportSourceDto;
        const tabular = importSource.dataStructureParameters as ImportSourceTabularParamsDto;
        const stationId: string | null = tabular.stationDefinition ? null : 'PREVIEW_STATION';

        const result: PreviewForSourceResponse = await this.previewForSource(sourceDef.sampleFileName, sourceId, stationId);
        // The sample session is view-only — clean it up so the client does not have to.
        await this.destroySession(result.raw.sessionId);
        result.raw.sessionId = '';
        return result;
    }

    /**
     * Source-scoped preview used by the import-entry flow. The base params
     * (adapter, rowsToSkip, delimiter) are read from the saved source spec
     * server-side rather than trusted from the client. Returns both the raw
     * and transformed previews in one round trip.
     *
     * `fileOrFileName` is either a freshly uploaded file (multipart) or the
     * basename of the spec's saved sample file.
     */
    public async previewForSource(
        fileOrFileName: string | Express.Multer.File,
        sourceId: number,
        stationId: string | null,
    ): Promise<PreviewForSourceResponse> {
        const sourceDef: ViewSourceSpecificationModel = this.sourcesService.find(sourceId);
        const baseParams: BaseParamsDto = this.extractBaseParams(sourceDef);
        const raw: RawPreviewResponse = await this.initAndPreviewRawData(fileOrFileName, baseParams);
        const transformed: TransformedPreviewResponse = await this.previewTransformedData(raw.sessionId, sourceDef, stationId);
        return { raw, transformed };
    }

    private extractBaseParams(sourceDef: ViewSourceSpecificationModel): BaseParamsDto {
        const importSource = sourceDef.parameters as ImportSourceDto;
        const tabular = importSource.dataStructureParameters as ImportSourceTabularParamsDto;
        return {
            importAdapterId: sourceDef.adapterId,
            rowsToSkip: tabular.rowsToSkip,
            delimiter: tabular.delimiter ?? null,
        };
    }

    private async applyAdapter(session: PreviewSession, importAdapterId: number | null): Promise<void> {
        if (importAdapterId) {
            const adapterOutputFileName = await this.runAdapterForPreview(session, importAdapterId, 0);
            session.workingFileName = adapterOutputFileName;
            session.fileLocation = 'intermediate';
        } else {
            session.workingFileName = session.originalFileName;
            session.fileLocation = 'input';
        }
        session.importAdapterId = importAdapterId;
    }

    public async previewRawData(session: PreviewSession): Promise<RawPreviewResponse> {
        const op = this.fileIOService.getOperationContext(session.operationId);
        const workingDir = session.fileLocation === 'input' ? op.inputDir : op.intermediateDir;
        const importFilePathName = path.posix.join(workingDir, session.workingFileName);
        const tableName: string = getTableNameFromUUID(crypto.randomUUID());

        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, false, session.rowsToSkip, 0, session.delimiter);

        const previewData: PreviewTableData = {
            columns: await DuckDBUtils.getColumnNames(this.fileIOService.duckDbConn, tableName),
            rows: await DuckDBUtils.getPreviewRows(this.fileIOService.duckDbConn, tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await DuckDBUtils.getPreviewRowCount(this.fileIOService.duckDbConn, tableName),
        };

        await this.fileIOService.duckDbConn.run(`DROP TABLE ${tableName};`);

        const skippedData: PreviewTableData = await DuckDBUtils.getSkippedData(this.fileIOService, importFilePathName, session.rowsToSkip, this.MAX_PREVIEW_ROWS, session.delimiter);

        // Read the head of the **original** uploaded file (pre-adapter) so
        // users can compare the raw bytes against DuckDB's parsed view.
        // Not partitioned on rowsToSkip — that setting is about parsed rows.
        const originalFilePath = path.posix.join(op.inputDir, session.originalFileName);
        const originalLines: string[] = await FileLinesUtils.readHeadLines(originalFilePath, session.rowsToSkip + this.MAX_PREVIEW_ROWS);

        return { sessionId: session.sessionId, fileName: session.workingFileName, previewData, skippedData, originalLines };
    }

    public async previewTransformedData(sessionId: string, sourceDef: ViewSourceSpecificationModel, stationId: string | null): Promise<TransformedPreviewResponse> {
        const session = this.getSession(sessionId);
        const op = this.fileIOService.getOperationContext(session.operationId);
        const workingDir = session.fileLocation === 'input' ? op.inputDir : op.intermediateDir;
        const importFilePathName = path.posix.join(workingDir, session.workingFileName);
        const tableName: string = getTableNameFromUUID(crypto.randomUUID());

        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, importFilePathName, tableName, false, session.rowsToSkip, 0, session.delimiter);

        const elements: CreateViewElementDto[] = this.elementsService.find();
        const flags: ViewFlagDto[] = this.flagsService.find();
        const error: FileProcessingError | void = await TabularImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, 0, sourceDef, elements, flags, stationId, null);

        const previewData: PreviewTableData = {
            columns: await DuckDBUtils.getColumnNames(this.fileIOService.duckDbConn, tableName),
            rows: await DuckDBUtils.getPreviewRows(this.fileIOService.duckDbConn, tableName, this.MAX_PREVIEW_ROWS),
            totalRowCount: await DuckDBUtils.getPreviewRowCount(this.fileIOService.duckDbConn, tableName),
        };

        await this.fileIOService.duckDbConn.run(`DROP TABLE ${tableName};`);

        return { previewData, error: error || undefined };
    }

    public async importData(sessionId: string, dto: PreviewForImportDto, userId: number): Promise<void> {
        const session = this.getSession(sessionId);
        const op: OperationContext = this.fileIOService.getOperationContext(session.operationId);
        // Working file lives in the input dir when no adapter was applied,
        // or the intermediate dir when the preview upload already ran the adapter.
        const workingDir: string = session.fileLocation === 'input' ? op.inputDir : op.intermediateDir;
        const inputFilePathName: string = path.posix.join(workingDir, session.workingFileName);

        // Skip the adapter step: it already ran during the preview upload.
        // Running it again here would either fail (adapter can't parse its
        // own output) or silently produce wrong data.
        const error: FileProcessingError | void = await this.observationImportService.transformForImport(dto.sourceId, inputFilePathName, op.outputDir, userId, dto.stationId ?? null);
        if (error) {
            throw new BadRequestException(error.message);
        }

        // Import to database from the operation's output directory
        const outputFiles = await fs.promises.readdir(op.outputDir);
        if (outputFiles.length === 0) {
            throw new BadRequestException('No processed data output found.');
        }
        const processedFilePathName = path.posix.join(op.dbOutputDir, outputFiles[0]);
        await this.observationImportService.importProcessedFileToDatabase(processedFilePathName);
    }

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

    /**
     * Runs an adapter on the session's original file and stores the output
     * in the operation's intermediate directory. Returns the basename
     * of the adapter output file.
     */
    private async runAdapterForPreview(session: PreviewSession, adapterId: number, userId: number): Promise<string> {
        const adapter: ViewAdapterSpecificationDto = this.adaptersService.find(adapterId);

        if (adapter.disabled) {
            throw new Error(`Adapter '${adapter.name}' is disabled`);
        }

        if (!this.adapterRunnerService.isRunnerEnabled(adapter.language)) {
            throw new Error(`The ${adapter.language} runner is not enabled in this deployment`);
        }

        const op: OperationContext = this.fileIOService.getOperationContext(session.operationId);
        // The runner expects a full FILE path, not the input directory — DuckDB
        // `read_csv` silently treats a directory as an empty source and would
        // otherwise produce a headers-only output file.
        const inputFilePathName = path.posix.join(op.inputDir, session.originalFileName);

        const adapterRef: AdapterRef = {
            id: adapter.id,
            name: adapter.name,
            language: adapter.language,
            scriptDirName: adapter.scriptDirName,
        };

        const metadata: AdapterRunMetadata = {
            initiatedByUserId: userId,
            initiatedAt: new Date().toISOString(),
            sourceSpecId: null,
            sourceSpecName: null,
            stationId: null,
            utcOffset: null,
            specParameters: null,
            testRun: false,
        };

        const result: AdapterRunResult = await this.adapterRunnerService.run(adapterRef, inputFilePathName, op.intermediateDir, metadata);

        if (result.status !== 'success') {
            throw new Error(`Adapter '${adapter.name}' failed: ${result.error?.message || 'unknown error'}`);
        }

        const adapterOutputFileName: string = path.basename(result.outputFiles[0]);
        this.logger.log(`Adapter '${adapter.name}' produced preview file: ${adapterOutputFileName}`);
        return adapterOutputFileName;
    }

}
