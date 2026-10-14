import { Injectable, Logger, OnModuleDestroy, OnModuleInit, StreamableFile } from '@nestjs/common';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api';

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

    private _duckDbInstance!: DuckDBInstance;
    private _duckDbConn!: DuckDBConnection;
    private _apiOperationsDir!: string;
    private _apiAdaptersDir!: string;
    private _apiSamplesDir!: string;
    private _dbOperationsDir!: string;

    public async onModuleInit() {
        // Same flat paths in dev, test, and prod. 
        // This assumes that these directories are always mounted as volumes in the respective containers.
        this._apiOperationsDir = '/app/operations';
        this._apiAdaptersDir = '/app/adapters';
        this._apiSamplesDir = '/app/samples';

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

    /**
     * The shared, long-lived connection. Everything interactive uses this:
     * import and metadata previews, and the bulk delete/restore/pk-update
     * flows, which create a table in one request and read it in a later one.
     */
    public get duckDbConn(): DuckDBConnection {
        return this._duckDbConn;
    }

    /**
     * An additional connection on the same in-memory database, for callers
     * that process several files at once.
     *
     * Statements on one connection are serialised, so a batch that wants real
     * concurrency needs a connection per worker.
     *
     * Working tables are ordinary (non-TEMP) tables in the shared catalog and
     * that is safe, because their names are UUID-derived and DuckDB's catalog
     * conflicts are per entry rather than per schema. The one thing to avoid
     * is index-creating DDL after a row modification — see the note on
     * `createTableFromFile` in duckdb.utils.ts.
     *
     * The caller owns the connection and must `disconnectSync()` it.
     */
    public async createDuckDbConnection(): Promise<DuckDBConnection> {
        return this._duckDbInstance.connect();
    }

    private async setupDuckDB() {
        // DuckDB is used purely as an ETL engine here: every table is scratch
        // space for one operation (file in, transform, file out) and is dropped
        // when that operation ends. Nothing is ever read back across a restart
        // — this directory is wiped on every boot, below — so a persistent
        // database bought no durability and charged for it anyway: each catalog
        // statement went through the WAL, which measured ~6x slower than the
        // same work in memory on the connector's real logger files.
        //
        // An in-memory instance makes that structural rather than a convention
        // someone has to remember. There is no file to leak a forgotten table
        // into, so `CREATE TABLE` cannot accidentally outlive its operation.
        // The connection itself still lives for the life of the process, so
        // flows that create a table in one request and read it in the next
        // (the bulk delete/restore/pk-update previews) are unaffected.
        const duckDbSpillPath = path.posix.join(this._apiOperationsDir, 'duckdb', 'spill');
        await fs.promises.rm(path.posix.join(this._apiOperationsDir, 'duckdb'), { recursive: true, force: true });
        await fs.promises.mkdir(duckDbSpillPath, { recursive: true });

        // The instance is retained, not discarded after the first connect:
        // `createDuckDbConnection()` opens further connections on this same
        // database so concurrent callers can run statements in parallel.
        this._duckDbInstance = await DuckDBInstance.create(':memory:');
        this._duckDbConn = await this._duckDbInstance.connect();

        // Required, not optional. An in-memory database can still process more
        // data than it can hold — it evicts to `temp_directory` — but that
        // setting defaults to '.tmp' relative to the process working directory,
        // which is the bind-mounted source tree in development. Point it at the
        // operations volume instead, which is where there is room and which the
        // cleanup sweep already knows to leave alone.
        await this._duckDbConn.run(`SET temp_directory = '${duckDbSpillPath.replace(/'/g, "''")}'`);

        // `memory_limit` and `threads` are deliberately left at DuckDB's own
        // defaults. DuckDB derives the limit from the cgroup when the container
        // has one, so the ceiling belongs in the deployment's memory limit
        // rather than in a constant here.
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
