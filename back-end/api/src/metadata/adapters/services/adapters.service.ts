import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';

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

/**
 * Manifest filenames required at the root of an uploaded zip, one per
 * supported language. The validator only checks for existence — detailed
 * dependency parsing is the runner's job at first-run time.
 *
 * For R we accept either `renv.lock` (preferred) or `DESCRIPTION`.
 */
const MANIFEST_FILENAMES: Record<AdapterLanguageEnum, string[]> = {
    [AdapterLanguageEnum.PYTHON]: ['requirements.txt'],
    [AdapterLanguageEnum.R]: ['renv.lock', 'DESCRIPTION'],
    [AdapterLanguageEnum.JAVASCRIPT]: ['package.json', 'package-lock.json'],
    [AdapterLanguageEnum.SQL]: ['extensions.txt'],
};

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
     * Returns the file tree and manifest validation for an already-saved
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
        const { manifestFound, manifestError } = this.checkManifestInTree(fileTree, entity.language);

        return {
            scriptDirName: entity.scriptDirName,
            fileTree,
            manifestFound,
            manifestError,
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
        const { manifestFound, manifestError } = this.checkManifestInTree(fileTree, language);

        return {
            scriptDirName,
            fileTree,
            manifestFound,
            manifestError,
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
     * Checks whether the file tree contains at least one accepted manifest
     * file for the given language. Uses the in-memory tree rather than
     * hitting the filesystem again.
     */
    private checkManifestInTree(fileTree: FileTreeEntry[], language: AdapterLanguageEnum): { manifestFound: boolean; manifestError?: string } {
        const acceptedNames = MANIFEST_FILENAMES[language];
        const manifestFound = acceptedNames.some(name =>
            fileTree.some(e => !e.isDirectory && path.basename(e.path) === name),
        );

        // console.log(`Checking manifest for language '${language}': found=${manifestFound}, acceptedNames=${acceptedNames.join(', ')}`);
        // console.log('File tree:', fileTree.map(e => `${e.isDirectory ? 'DIR ' : 'FILE'} ${e.path}`).join('\n'));

        const manifestError = manifestFound ? undefined : `Missing manifest file for '${language}'. Expected one of: ${acceptedNames.join(', ')} at the root of the archive.`;
        return { manifestFound, manifestError };
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
     * of the directory on disk. This method validates the entry point exists
     * inside that directory, then inserts the DB row.
     *
     * Manifest validation is NOT repeated here — it was already checked
     * during `uploadPreview()`, and the frontend disables save unless
     * `manifestFound === true`. The zip contents haven't changed since.
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

        await this.validateEntryPoint(scriptDir, dto.entryPoint);

        const entity = this.adapterRepo.create({
            name: dto.name,
            description: dto.description ?? null,
            language: dto.language,
            scriptDirName: dto.scriptDirName,
            entryPoint: dto.entryPoint,
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
     * Manifest validation is NOT repeated — same reasoning as `create()`.
     */
    public async update(id: number, dto: UpdateAdapterSpecificationDto, userId: number): Promise<ViewAdapterSpecificationDto> {
        const entity = await this.findEntity(id);

        console.log(`Updating adapter #${id} with data:`, dto);

        entity.name = dto.name;
        entity.description = dto.description ?? null;
        entity.disabled = dto.disabled;
        entity.comment = dto.comment ?? null;
        entity.entryUserId = userId;

        const scriptDir = this.fileIO.getAdapterScriptDir(dto.scriptDirName);
        await this.assertDirExists(scriptDir, `Script directory '${dto.scriptDirName}' not found. Please upload the zip file first.`);
        entity.scriptDirName = dto.scriptDirName;

        await this.validateEntryPoint(scriptDir, dto.entryPoint);
        entity.entryPoint = dto.entryPoint;

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
            console.error(`Test run failed: runner for language '${dto.language}' is not enabled`);
            return this.toTestRunFailure(FileProcessingErrorType.RUNNER_DISABLED, `The ${dto.language} runner is not enabled in this deployment.`);
        }

        const scriptDir: string = this.fileIO.getAdapterScriptDir(dto.scriptDirName);
        try {
            await this.assertDirExists(scriptDir, '');
        } catch {
            return this.toTestRunFailure(FileProcessingErrorType.RUNTIME_ERROR, `Script directory '${dto.scriptDirName}' not found. Please upload the zip file first.`);
        }

        await this.validateEntryPoint(scriptDir, dto.entryPoint);

        const op = await this.fileIO.createOperation();

        try {
            const inputFilePathName: string = path.posix.join(op.inputDir, sampleFile.originalname);
            await fs.promises.writeFile(inputFilePathName, sampleFile.buffer);

            const adapterRef: AdapterRef = {
                id: 0,
                name: '(unsaved adapter)',
                language: dto.language,
                scriptDirName: dto.scriptDirName,
                entryPoint: dto.entryPoint,
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
            
            this.logger.log(`Test run completed with status '${result.status}' in ${result.durationMs}ms. Output files: ${result.outputFiles.join(', ')}`);

            return {
                status: result.status,
                durationMs: result.durationMs,
                outputFileName: result.outputFiles.length > 0 ? path.posix.basename(result.outputFiles[0]) : null,
                stdout: result.stdout,
                stderr: result.stderr,
                installLog: result.installLog,
                warnings: result.warnings,
                error: result.error,
            };
        } finally {
            await this.fileIO.deleteOperation(op.operationId);
        }
    }

    private toTestRunFailure(type: FileProcessingErrorType, message: string): AdapterTestRunResponseDto {
        return {
            status: 'failure',
            durationMs: 0,
            outputFileName: null,
            stdout: '',
            stderr: '',
            installLog: null,
            warnings: [],
            error: { type, message },
        };
    }

    //--------------------------------------------------------------------
    // Delete
    //--------------------------------------------------------------------

    public async delete(id: number): Promise<void> {
        const entity: AdapterSpecificationEntity = await this.findEntity(id);
        await this.adapterRepo.remove(entity);
        await this.cache.invalidate();
        this.logger.log(`Adapter deleted: #${id}. On-disk script directories are retained.`);
    }

    public async deleteAll(): Promise<void> {
        const entities: AdapterSpecificationEntity[] = await this.adapterRepo.find();
        await this.adapterRepo.remove(entities);
        await this.cache.invalidate();
        this.logger.log(`All adapters deleted. On-disk script directories are retained.`);
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
            name: entity.name,
            description: entity.description ?? '',
            language: entity.language,
            scriptDirName: entity.scriptDirName,
            entryPoint: entity.entryPoint,
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
     * Verifies the entry point path points at an actual file inside the
     * script directory. Also guards against zip-slip-style paths that
     * try to escape the directory.
     */
    private async validateEntryPoint(scriptDir: string, entryPoint: string): Promise<void> {
        const normalised = path.posix.normalize(entryPoint.replaceAll('\\', '/'));
        if (path.posix.isAbsolute(normalised) || normalised.startsWith('..')) {
            throw new BadRequestException(`Entry point '${entryPoint}' must be a relative path inside the zip`);
        }

        const fullPath = path.posix.join(scriptDir, normalised);
        if (!fullPath.startsWith(scriptDir + path.posix.sep) && fullPath !== scriptDir) {
            throw new BadRequestException(`Entry point '${entryPoint}' escapes the adapter directory`);
        }

        try {

            const stat = await fs.promises.stat(fullPath);

            if (!stat.isFile()) {
                throw new BadRequestException(`Entry point '${entryPoint}' exists but is not a file`);
            }
        } catch (err) {
            this.logger.error(`Entry point validation failed for '${entryPoint}': ${(err as Error).message}`);
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new BadRequestException(`Entry point '${entryPoint}' does not exist inside the adapter script directory`);
            }
            throw err;
        }
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
