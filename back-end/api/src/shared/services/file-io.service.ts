import { Injectable, Logger, OnModuleDestroy, OnModuleInit, StreamableFile } from '@nestjs/common';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api';
import { AppConfig } from 'src/app.config';

/**
 * Every file-processing operation (import, export, adapter test run, preview)
 * gets its own UUID directory with three subdirectories. Each step in a
 * pipeline reads from one directory and writes to the next.
 */
export interface OperationContext {
    operationId: crypto.UUID;
    /** API-perspective root: /app/operations/<uuid> */
    apiDir: string;
    /** Database-perspective root: /var/lib/postgresql/operations/<uuid> */
    dbDir: string;
    /** API-perspective input directory */
    inputDir: string;
    /** API-perspective intermediate directory */
    intermediateDir: string;
    /** API-perspective output directory */
    outputDir: string;
    /** Database-perspective input directory */
    dbInputDir: string;
    /** Database-perspective intermediate directory */
    dbIntermediateDir: string;
    /** Database-perspective output directory */
    dbOutputDir: string;
}

@Injectable()
export class FileIOService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(FileIOService.name);

    private _duckDbConn!: DuckDBConnection;
    private _apiOperationsDir!: string;
    private _apiAdaptersDir!: string;
    private _apiSamplesDir!: string;
    private _dbOperationsDir!: string;

    public async onModuleInit() {
        if (AppConfig.devMode) {
            const tempDir: string = path.posix.join(process.cwd().replaceAll('\\', '/'), 'temp');
            this._apiOperationsDir = path.posix.join(tempDir, 'operations');
            this._apiAdaptersDir = path.posix.join(tempDir, 'adapters');
            this._apiSamplesDir = path.posix.join(tempDir, 'samples');
        } else {
            this._apiOperationsDir = '/app/operations';
            this._apiAdaptersDir = '/app/adapters';
            this._apiSamplesDir = '/app/samples';
        }

        // Database container path — the same operations volume is mounted at a different path in the Postgres container.
        this._dbOperationsDir = '/var/lib/postgresql/operations';

        await fs.promises.mkdir(this._apiOperationsDir, { recursive: true });
        await fs.promises.mkdir(this._apiAdaptersDir, { recursive: true });
        await fs.promises.mkdir(this._apiSamplesDir, { recursive: true });

        await this.setupDuckDB();

        this.logger.log('Operations, adapters and samples directories ready; DuckDB connection initialised');
    }

    public async onModuleDestroy() {
        this._duckDbConn.disconnectSync();
    }

    // ── Operations ──────────────────────────────────────────────────────

    public get apiOperationsDir(): string {
        return this._apiOperationsDir;
    }


    /**
     * Creates a new operation directory with input/, intermediate/, and output/ subdirectories.
     *
     * The directories are made world-writable (mode 0o777, that is, rwxrwxrwxt) so any container
     * sharing the operations volume can read/write inside them, regardless of
     * which UID that container runs as. The API creates the dirs (as root in
     * its container), but other containers also need to write here:
     *
     *   - Postgres (`COPY TO`/`COPY FROM`) — definitely runs as a different
     *     UID (the postgres user, ~999), so this is the load-bearing case.
     *   - Adapter runners (Python/R/JavaScript/DuckDB) — currently run as
     *     root, but switching them to non-root users is a good security
     *     practice we may want to adopt later.
     *
     * Without this chmod, the default umask (0o022) masks the write bit for
     * group/others, leaving non-root containers unable to create files in
     * directories the API made.
     */
    public async createOperation(): Promise<OperationContext> {
        const operationId: crypto.UUID = crypto.randomUUID();
        const ctx = this.getOperationContext(operationId);
        await fs.promises.mkdir(ctx.inputDir, { recursive: true });
        await fs.promises.mkdir(ctx.intermediateDir, { recursive: true });
        await fs.promises.mkdir(ctx.outputDir, { recursive: true });
        await fs.promises.chmod(ctx.apiDir, 0o777);
        await fs.promises.chmod(ctx.inputDir, 0o777);
        await fs.promises.chmod(ctx.intermediateDir, 0o777);
        await fs.promises.chmod(ctx.outputDir, 0o777);
        return ctx;
    }

    /**
     * Reconstructs an OperationContext from an existing operationId without creating directories.
     */
    public getOperationContext(operationId: crypto.UUID): OperationContext {
        const apiDir = path.posix.join(this._apiOperationsDir, operationId);
        const dbDir = path.posix.join(this._dbOperationsDir, operationId);
        return {
            operationId: operationId,
            apiDir: apiDir,
            dbDir: dbDir,
            inputDir: path.posix.join(apiDir, 'input'),
            intermediateDir: path.posix.join(apiDir, 'intermediate'),
            outputDir: path.posix.join(apiDir, 'output'),
            dbInputDir: path.posix.join(dbDir, 'input'),
            dbIntermediateDir: path.posix.join(dbDir, 'intermediate'),
            dbOutputDir: path.posix.join(dbDir, 'output'),
        };
    }

    /**
     * Deletes an entire operation directory and all its contents.
     */
    public async deleteOperation(operationId: string): Promise<void> {
        const apiDir = path.posix.join(this._apiOperationsDir, operationId);
        try {
            await fs.promises.rm(apiDir, { recursive: true, force: true });
        } catch (err) {
            this.logger.warn(`Could not delete operation directory ${apiDir}: ${(err as Error).message}`);
        }
    }

    // ── Adapters ────────────────────────────────────────────────────────

    public get apiAdaptersDir(): string {
        return this._apiAdaptersDir;
    }

    /**
     * Returns the full path to the unzipped script tree for a specific adapter.
     * Flat structure: /app/adapters/<uuid>/
     */
    public getAdapterScriptDir(scriptDirName: string): string {
        return path.posix.join(this._apiAdaptersDir, scriptDirName);
    }

    // ── Samples ────────────────────────────────────────────────────────

    /** Persistent directory for source specification sample files. */
    public get apiSamplesDir(): string {
        return this._apiSamplesDir;
    }

    // ── DuckDB ──────────────────────────────────────────────────────────

    public get duckDbConn(): DuckDBConnection {
        return this._duckDbConn;
    }

    private async setupDuckDB() {
        const duckDbPath = path.posix.join(this._apiOperationsDir, 'duckdb');
        await fs.promises.rm(duckDbPath, { recursive: true, force: true });
        await fs.promises.mkdir(duckDbPath, { recursive: true });

        const duckDbInstance: DuckDBInstance = await DuckDBInstance.create(path.posix.join(duckDbPath, 'duckdb_io.db'));
        this._duckDbConn = await duckDbInstance.connect();
    }

    // ── Legacy file I/O helpers ─────────────────────────────────────────

    public createStreamableFile(filePathName: string) {
        return new StreamableFile(fs.createReadStream(filePathName));
    }


    //--------------------------
    // The 2 functions below can be removed once the sql-scripts-loader.service.ts is refactored to not use tem
    public async readFile(filePathName: string, encoding: 'utf8' = 'utf8') {
        try {
            return await fs.promises.readFile(filePathName, { encoding: encoding })
        } catch (err) {
            throw new Error("Could not read file: " + err);
        }
    }

    public async getFileNamesInDirectory(directory: string): Promise<string[]> {
        try {
            const files = await fs.promises.readdir(directory.replaceAll("\\", "\/"));
            return files;
        } catch (err) {
            console.error('Error reading directory:', err);
            throw new Error("Error reading directory: " + err);
        }
    }
    //--------------------------

}
