import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';

import { ZipUtils } from 'src/shared/utils/zip.utils';
import { AdapterSpecificationEntity } from '../entities/adapter-specification.entity';
import { CreateAdapterSpecificationDto } from '../dtos/create-adapter-specification.dto';
import { UpdateAdapterSpecificationDto } from '../dtos/update-adapter-specification.dto';
import { ViewAdapterSpecificationDto } from '../dtos/view-adapter-specification.dto';
import { AdapterTestRunResponseDto } from '../dtos/adapter-run-result.dto';
import { AdapterUploadPreviewResponseDto, FileTreeEntry } from '../dtos/adapter-upload-preview.dto';
import { AdapterLanguageEnum } from '../enums/adapter-language.enum';
import { FileIOService } from 'src/shared/services/file-io.service';
import { AdapterRef, AdapterRunMetadata, AdapterRunnerService, AdapterRunResult } from 'src/shared/services/adapter-runner.service';
import { CacheLoadResult, MetadataCache } from 'src/shared/cache/metadata-cache';
import { AdapterTestRunPreviewDto } from '../dtos/adapter-test-run-preview.dto';
import { FileProcessingErrorType } from 'src/metadata/file-processing-error.model';
import { LANGUAGE_CONVENTIONS } from '../adapter-language-conventions';

@Injectable()
export class AdaptersService implements OnModuleInit {
    private readonly logger = new Logger(AdaptersService.name);
    private readonly cache: MetadataCache<ViewAdapterSpecificationDto>;

    constructor(
        @InjectRepository(AdapterSpecificationEntity) private readonly adapterRepo: Repository<AdapterSpecificationEntity>,
        private readonly fileIO: FileIOService,
        private readonly runner: AdapterRunnerService,
    ) {
        this.cache = new MetadataCache<ViewAdapterSpecificationDto>(
            'Adapters',
            () => this.loadCacheData(),
            (dto) => dto.id,
        );
    }

    async onModuleInit(): Promise<void> {
        await this.cache.init();
    }

    private async loadCacheData(): Promise<CacheLoadResult<ViewAdapterSpecificationDto>> {
        const entities = await this.adapterRepo.find({ order: { id: 'ASC' } });
        const records = entities.map(entity => this.toViewDto(entity));
        const lastModifiedDate = entities.length > 0
            ? entities.reduce((max, e) => e.entryDateTime > max ? e.entryDateTime : max, entities[0].entryDateTime)
            : null;
        return { records, lastModifiedDate };
    }

    //--------------------------------------------------------------------
    // Read
    //--------------------------------------------------------------------

    public findAll(): ViewAdapterSpecificationDto[] {
        return this.cache.getAll();
    }

    public find(id: number): ViewAdapterSpecificationDto {
        const dto = this.cache.getById(id);
        
        if (!dto) {
            throw new NotFoundException(`Adapter #${id} not found`);
        }
        return dto;
    }

    /**
     * Returns the file tree and root-level validation for an already-saved
     * adapter's script directory. Used by the dialog when opening an
     * existing adapter in edit mode.
     */
    public async getFileTree(id: number): Promise<AdapterUploadPreviewResponseDto> {
        const entity = await this.findEntity(id);
        const scriptDir = this.fileIO.getAdapterScriptDir(entity.scriptDirName);

        await this.assertDirExists(scriptDir,
            `Script directory '${entity.scriptDirName}' not found on disk for adapter #${id}`,
        );

        const fileTree = await this.buildFileTree(scriptDir);

        return {
            scriptDirName: entity.scriptDirName,
            fileTree,
            manifestError: this.checkManifestAtRoot(fileTree, entity.language),
            entryPointError: this.checkEntryPointAtRoot(fileTree, entity.language),
        };
    }

    //--------------------------------------------------------------------
    // Upload preview
    //--------------------------------------------------------------------

    /**
     * Uploads and extracts a zip file, validates the manifest, and returns
     * the file tree so the dialog can show what's inside before saving.
     *
     * The extracted directory is persisted to disk immediately (same pattern
     * as import spec sample files). If the user never saves, the orphaned
     * directory will be cleaned up by `CleanupSchedulerService`.
     */
    public async uploadPreview(zipFile: Express.Multer.File, language: AdapterLanguageEnum): Promise<AdapterUploadPreviewResponseDto> {
        if (!zipFile) {
            throw new BadRequestException('A zip file is required');
        }

        const scriptDirName: crypto.UUID = crypto.randomUUID();
        const scriptDir = await this.unzipToScriptDir(zipFile, scriptDirName);

        const fileTree: FileTreeEntry[] = await this.buildFileTree(scriptDir);

        return {
            scriptDirName,
            fileTree,
            manifestError: this.checkManifestAtRoot(fileTree, language),
            entryPointError: this.checkEntryPointAtRoot(fileTree, language),
        };
    }

    /**
     * Recursively builds a flat file tree from a directory, suitable for
     * rendering in the frontend. Entries are in depth-first order with
     * forward-slash paths relative to the root.
     */
    /**
     * Directory created by the runner to store installed dependencies.
     * Excluded from the file tree shown to users.
     */
    public static readonly INSTALLED_DIR_NAME = '.installed';

    private async buildFileTree(rootDir: string, relativePath: string = ''): Promise<FileTreeEntry[]> {
        const entries: FileTreeEntry[] = [];
        const dirEntries: fs.Dirent[] = await fs.promises.readdir(path.posix.join(rootDir, relativePath), { withFileTypes: true });

        dirEntries.sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        for (const entry of dirEntries) {
            // Skip the runner-managed dependency directory
            if (entry.isDirectory() && entry.name === AdaptersService.INSTALLED_DIR_NAME) continue;

            const entryPath: string = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            entries.push({ path: entryPath, isDirectory: entry.isDirectory() });
            if (entry.isDirectory()) {
                const children = await this.buildFileTree(rootDir, entryPath);
                entries.push(...children);
            }
        }

        return entries;
    }

    /**
     * Returns an error message if the language's required manifest file is
     * not present at the ROOT of the tree (top-level files only, no
     * directory prefix). Returns `undefined` if the manifest is present.
     *
     * Root-only enforcement is intentional: runners execute from the extracted
     * script directory and expect the manifest at that same level. A zip whose
     * files are nested inside a wrapper folder (a common user mistake) must
     * fail here rather than at runtime.
     */
    private checkManifestAtRoot(fileTree: FileTreeEntry[], language: AdapterLanguageEnum): string | undefined {
        const expected = LANGUAGE_CONVENTIONS[language].manifest;
        const found = fileTree.some(e => !e.isDirectory && e.path === expected);
        if (found) return undefined;
        return `Missing manifest file '${expected}' at the root of the archive for language '${language}'.`;
    }

    /**
     * Returns an error message if the language's canonical entry-point file is
     * not present at the ROOT of the tree. Users don't choose the entry-point
     * name — it's a language convention (`main.py`, `main.R`, `index.js`,
     * `transform.sql`) enforced here so the runner never has to guess.
     */
    private checkEntryPointAtRoot(fileTree: FileTreeEntry[], language: AdapterLanguageEnum): string | undefined {
        const expected = LANGUAGE_CONVENTIONS[language].entryPoint;
        const found = fileTree.some(e => !e.isDirectory && e.path === expected);
        if (found) return undefined;
        return `Missing entry-point file '${expected}' at the root of the archive for language '${language}'.`;
    }

    //--------------------------------------------------------------------
    // Cleanup integration
    //--------------------------------------------------------------------

    /**
     * Returns the set of all `scriptDirName` values currently referenced by
     * adapter specifications. Used by `CleanupSchedulerService` to identify
     * orphaned script directories that can be deleted.
     */
    public findAllReferencedScriptDirs(): Set<string> {
        return new Set(this.cache.getAll().map(dto => dto.scriptDirName));
    }

    //--------------------------------------------------------------------
    // Create
    //--------------------------------------------------------------------

    /**
     * Creates a new adapter specification. The zip has already been uploaded
     * and extracted via `uploadPreview()` — `dto.scriptDirName` is the UUID
     * of the directory on disk.
     *
     * Manifest and entry-point validation are NOT repeated here — they were
     * already checked during `uploadPreview()`, and the frontend disables save
     * unless both errors are absent. The zip contents haven't changed since.
     */
    public async create(
        dto: CreateAdapterSpecificationDto,
        userId: number,
    ): Promise<ViewAdapterSpecificationDto> {
        const existing = await this.adapterRepo.findOneBy({ name: dto.name });
        if (existing) {
            throw new BadRequestException(`Adapter with name '${dto.name}' already exists`);
        }

        const scriptDir = this.fileIO.getAdapterScriptDir(dto.scriptDirName);
        await this.assertDirExists(scriptDir,
            `Script directory '${dto.scriptDirName}' not found. Please upload the zip file first.`,
        );

        const entity = this.adapterRepo.create({
            name: dto.name,
            description: dto.description ?? null,
            language: dto.language,
            scriptDirName: dto.scriptDirName,
            disabled: dto.disabled,
            comment: dto.comment ?? null,
            entryUserId: userId,
        });
        await this.adapterRepo.save(entity);
        await this.cache.invalidate();

        this.logger.log(`Adapter created: #${entity.id} '${entity.name}' (${entity.language}) script=${dto.scriptDirName}`);
        return this.toViewDto(entity);
    }

    //--------------------------------------------------------------------
    // Update
    //--------------------------------------------------------------------

    /**
     * Updates an existing adapter specification. `dto.scriptDirName` may
     * point to a new directory from a recent `uploadPreview()` call — the
     * old directory stays on disk for forensics.
     *
     * Manifest and entry-point validation are NOT repeated — same reasoning
     * as `create()`.
     */
    public async update(id: number, dto: UpdateAdapterSpecificationDto, userId: number): Promise<ViewAdapterSpecificationDto> {
        const entity = await this.findEntity(id);

        if (entity.systemKey !== null) {
            entity.disabled = dto.disabled;
        } else {
            entity.name = dto.name;
            entity.description = dto.description ?? null;
            entity.disabled = dto.disabled;
            entity.comment = dto.comment ?? null;
            const scriptDir = this.fileIO.getAdapterScriptDir(dto.scriptDirName);
            await this.assertDirExists(scriptDir, `Script directory '${dto.scriptDirName}' not found. Please upload the zip file first.`);
            entity.scriptDirName = dto.scriptDirName;
        }
        entity.entryUserId = userId;

        await this.adapterRepo.save(entity);
        await this.cache.invalidate();

        this.logger.log(`Adapter updated: #${entity.id} '${entity.name}' (script=${entity.scriptDirName})`);
        return this.toViewDto(entity);
    }

    //--------------------------------------------------------------------
    // Test run
    //--------------------------------------------------------------------



    /**
     * Runs a test against an adapter that hasn't been saved yet. Uses the
     * `scriptDirName` from a prior `uploadPreview()` call and the entry
     * point + language supplied by the dialog. This lets sysadmins verify
     * their script works before committing to a save.
     */
    public async testRunPreview(dto: AdapterTestRunPreviewDto, sampleFile: Express.Multer.File, userId: number): Promise<AdapterTestRunResponseDto> {
        if (!this.runner.isRunnerEnabled(dto.language)) {
            console.warn(`Test run failed: runner for language '${dto.language}' is not enabled`);
            return this.toTestRunFailure(FileProcessingErrorType.RUNNER_DISABLED, `The ${dto.language} runner is not enabled in this deployment.`);
        }

        const scriptDir: string = this.fileIO.getAdapterScriptDir(dto.scriptDirName);
        try {
            await this.assertDirExists(scriptDir, '');
        } catch {
            return this.toTestRunFailure(FileProcessingErrorType.RUNTIME_ERROR, `Script directory '${dto.scriptDirName}' not found. Please upload the zip file first.`);
        }

        const op = await this.fileIO.createOperation();

        const inputFilePathName: string = path.posix.join(op.inputDir, sampleFile.originalname);
        await fs.promises.writeFile(inputFilePathName, sampleFile.buffer);

        this.logger.log(`Starting test run for adapter '${dto.scriptDirName}' with sample file '${sampleFile.originalname}' written to '${inputFilePathName}'`);

        const adapterRef: AdapterRef = {
            id: 0,
            name: '(unsaved adapter)',
            language: dto.language,
            scriptDirName: dto.scriptDirName,
        };

        const metadata: AdapterRunMetadata = {
            initiatedByUserId: userId,
            initiatedAt: new Date().toISOString(),
            sourceSpecId: null,
            sourceSpecName: null,
            stationId: null,
            utcOffset: null,
            specParameters: null,
            testRun: true,
        };

        const result: AdapterRunResult = await this.runner.run(adapterRef, inputFilePathName, op.outputDir, metadata);

        this.logger.log(`Test run completed with status '${result.status}' in ${result.durationMs}ms. Output files: ${result.outputFiles.map(f => f.name).join(', ')}`);

        // The operation directory is intentionally NOT deleted here — the
        // dialog needs it available so the sysadmin can download the output
        // (including log files) as a zip. `CleanupSchedulerService` sweeps
        // orphaned op dirs based on the configured `daysOld` TTL.
        return {
            status: result.status,
            durationMs: result.durationMs,
            outputFiles: result.outputFiles,
            logFiles: result.logFiles,
            operationId: result.outputFiles.length > 0 ? op.operationId : null,
            error: result.error,
        };
    }

    private toTestRunFailure(type: FileProcessingErrorType, message: string): AdapterTestRunResponseDto {
        return {
            status: 'failure',
            durationMs: 0,
            outputFiles: [],
            logFiles: [],
            operationId: null,
            error: { type, message },
        };
    }

    //--------------------------------------------------------------------
    // Download
    //--------------------------------------------------------------------

    /**
     * Builds an in-memory zip of a saved adapter's script directory so a
     * sysadmin can download it, edit locally, and re-upload. Excludes the
     * runner-managed `.installed/` directory — users only care about the
     * source files, and installed dependencies can be many megabytes.
     *
     * Returns the zip buffer and a filesystem-safe filename derived from
     * the adapter name.
     */
    public async buildDownloadZip(id: number): Promise<{ buffer: Buffer; filename: string }> {
        const entity = await this.findEntity(id);
        const scriptDir = this.fileIO.getAdapterScriptDir(entity.scriptDirName);

        await this.assertDirExists(scriptDir,
            `Script directory '${entity.scriptDirName}' not found on disk for adapter #${id}`,
        );

        return {
            buffer: ZipUtils.buildZipBufferFromDir(scriptDir, new Set([AdaptersService.INSTALLED_DIR_NAME])),
            filename: `${AdaptersService.sanitiseZipFilename(entity.name, id)}.zip`,
        };
    }

    /**
     * Builds an in-memory zip of a test run's operation output directory,
     * including any log files. Called after a successful `testRunPreview`
     * so the sysadmin can inspect what the adapter actually produced.
     *
     * Throws `NotFoundException` if the operation dir was already swept by
     * the file-cleanup scheduler.
     */
    public async getTestRunOutputZip(operationId: string): Promise<{ buffer: Buffer; filename: string }> {
        const op = this.fileIO.getOperationContext(operationId as crypto.UUID);

        try {
            await this.assertDirExists(op.outputDir, `Test-run output directory not found for operation '${operationId}'.`);
        } catch (err) {
            throw new NotFoundException((err as Error).message);
        }

        const entries = await fs.promises.readdir(op.outputDir);
        if (entries.length === 0) {
            throw new NotFoundException(`Test-run output directory is empty for operation '${operationId}'.`);
        }

        return {
            buffer: ZipUtils.buildZipBufferFromDir(op.outputDir),
            filename: `test-run-${operationId}.zip`,
        };
    }

    /**
     * Reduces an adapter name to a safe filename component: alphanumerics,
     * dot, dash, and underscore; whitespace collapsed to underscore. Falls
     * back to `adapter-<id>` for empty results so we never emit a bare `.zip`
     * or a filename that could confuse the browser's Content-Disposition parser.
     */
    private static sanitiseZipFilename(name: string, id: number): string {
        const sanitised = name
            .replace(/\s+/g, '_')
            .replace(/[^A-Za-z0-9._-]/g, '');
        return sanitised.length > 0 ? sanitised : `adapter-${id}`;
    }

    //--------------------------------------------------------------------
    // Delete
    //--------------------------------------------------------------------

    public async delete(id: number): Promise<void> {
        const entity: AdapterSpecificationEntity = await this.findEntity(id);
        if (entity.systemKey !== null) {
            throw new BadRequestException(`Adapter '${entity.name}' is a system adapter and cannot be deleted`);
        }
        await this.adapterRepo.remove(entity);
        await this.cache.invalidate();
        this.logger.log(`Adapter deleted: #${id}. On-disk script directories are retained.`);
    }

    public async deleteAll(): Promise<void> {
        const entities: AdapterSpecificationEntity[] = await this.adapterRepo.find({ where: { systemKey: IsNull() } });
        await this.adapterRepo.remove(entities);
        await this.cache.invalidate();
        this.logger.log(`All user-defined adapters deleted. System adapters and on-disk script directories are retained.`);
    }

    //--------------------------------------------------------------------
    // Internals
    //--------------------------------------------------------------------

    private async findEntity(id: number): Promise<AdapterSpecificationEntity> {
        const entity = await this.adapterRepo.findOneBy({ id });
        if (!entity) {
            throw new NotFoundException(`Adapter #${id} not found`);
        }
        return entity;
    }

    private toViewDto(entity: AdapterSpecificationEntity): ViewAdapterSpecificationDto {
        return {
            id: entity.id,
            systemKey: entity.systemKey ?? null,
            name: entity.name,
            description: entity.description ?? '',
            language: entity.language,
            scriptDirName: entity.scriptDirName,
            disabled: entity.disabled,
            comment: entity.comment ?? '',
        };
    }

    /**
     * Unzips the uploaded buffer directly into the final script directory at
     * `<adaptersRoot>/<language>/scripts/<scriptDirName>/`. Returns the
     * absolute path. If extraction fails, the directory is cleaned up.
     */
    private async unzipToScriptDir(zipFile: Express.Multer.File, scriptDirName: string): Promise<string> {
        if (!zipFile.buffer || zipFile.buffer.length === 0) {
            throw new BadRequestException('Uploaded file is empty');
        }

        let zip: AdmZip;
        try {
            zip = new AdmZip(zipFile.buffer);
        } catch (err) {
            throw new BadRequestException(`Uploaded file is not a valid zip archive: ${(err as Error).message}`);
        }

        const scriptDir: string = this.fileIO.getAdapterScriptDir(scriptDirName);
        await fs.promises.mkdir(scriptDir, { recursive: true });

        try {
            zip.extractAllTo(scriptDir, false);
        } catch (err) {
            await this.removeDirIfExists(scriptDir);
            throw new BadRequestException(`Failed to extract zip: ${(err as Error).message}`);
        }

        return scriptDir;
    }

    /**
     * Asserts a directory exists on disk. Throws `BadRequestException` (for
     * user-facing errors like "upload the zip first") or `NotFoundException`
     * (for missing saved data) depending on the supplied message.
     */
    private async assertDirExists(dirPath: string, errorMessage: string): Promise<void> {
        try {
            const stat = await fs.promises.stat(dirPath);
            if (!stat.isDirectory()) {
                throw new BadRequestException(errorMessage);
            }
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new BadRequestException(errorMessage);
            }
            throw err;
        }
    }

    private async removeDirIfExists(dir: string): Promise<void> {
        try {
            await fs.promises.rm(dir, { recursive: true, force: true });
        } catch (err) {
            this.logger.warn(`Failed to clean up directory ${dir}: ${(err as Error).message}`);
        }
    }
}
