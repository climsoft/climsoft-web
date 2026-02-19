import { Injectable, Logger, OnModuleDestroy, StreamableFile } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api';
import { AppConfig } from 'src/app.config';

// TODO. After removing the deprecated file io methods from various services, we can rename this service

@Injectable()
export class FileIOService implements OnModuleDestroy {
    private readonly logger = new Logger(FileIOService.name);

    private _duckDbConn: DuckDBConnection;
    private _apiImportsDir: string;
    private _apiExportsDir: string;
    private _dbImportsDir: string;
    private _dbExportsDir: string;

    constructor() {
        if (AppConfig.devMode) {
            // Dev mode uses local file system for easier debugging and development. 
            // Files are stored under a 'temp' directory in the project root which is mounted to any test docker container. 
            // This allows us to easily inspect files.

            const _tempDir: string = path.posix.join(process.cwd().replaceAll('\\', '/'), 'temp');
            this._apiImportsDir = path.posix.join(process.cwd().replaceAll('\\', '/'), 'temp', 'imports');
            this._apiExportsDir = path.posix.join(process.cwd().replaceAll('\\', '/'), 'temp', 'exports');

            // Delete the temp directory first to ensure a clean state on each server restart. This prevents issues with file locks and permission errors after hot reloads in development.
            // try {
            //     fs.rmSync(_tempDir, { recursive: true, force: true });
            //     this.logger.log(`Deleted existing temp directory: ${_tempDir}`);
            // } catch (err) {
            //     this.logger.warn(`Could not delete temp directory (it may not exist): ${_tempDir}`);
            // }

            fs.mkdirSync(_tempDir, { recursive: true });
            fs.mkdirSync(this._apiImportsDir, { recursive: true });
            fs.mkdirSync(this._apiExportsDir, { recursive: true });
        } else {
            // In production mode, the API runs in a docker container where /app/imports and /app/exports are mounted volumes. 
            // The csv2bufr service can also access files in the exports directory via /app/exports.
            this._apiImportsDir = '/app/imports';
            this._apiExportsDir = '/app/exports';

            // Ensure the directories exist in the container
            fs.mkdirSync(this._apiImportsDir, { recursive: true });
            fs.mkdirSync(this._apiExportsDir, { recursive: true });
        }

        // Database container paths
        // In all modes, the database runs in a separate container where /var/lib/postgresql/imports and /var/lib/postgresql/exports are mounted volumes.
        // These directories are mapped to the API container's /app/imports and /app/exports respectively.
        // The database container will automatically have access to files placed in these directories by the API.
        // It will also automatically create these directories if they do not exist.
        this._dbImportsDir = '/var/lib/postgresql/imports';
        this._dbExportsDir = '/var/lib/postgresql/exports';

        this.logger.log(`API Imports and export directory created successfully`);

        // Initialise DuckDB
        this.setupDuckDB();
    }

    public async onModuleDestroy() {
        this._duckDbConn.disconnectSync();
    }

    public get apiImportsDir(): string {
        return this._apiImportsDir;
    }

    public get apiExportsDir(): string {
        return this._apiExportsDir;
    }

    public get dbImportsDir(): string {
        return this._dbImportsDir;
    }

    public get dbExportsDir(): string {
        return this._dbExportsDir
    }


    // TODO. Push duckdb related functionalities to a separate duckdb service

    public get duckDbConn(): DuckDBConnection {
        return this._duckDbConn;
    }

    // Move to a duckdb service under a different NodeJS process that manages duckdb. Helps with any duckdb crushes
    private async setupDuckDB() {
        // Fist delete the duck db path to prevent DuckDB WAL file corruption issues after NestJS hot reloads

        const duckDbPath = path.posix.join(this._apiImportsDir, 'duckdb');
        if (fs.existsSync(duckDbPath)) {
            fs.rmSync(duckDbPath, { recursive: true, force: true });
            this.logger.log(`Deleted existing DuckDB data at: ${duckDbPath}`);
        }
        fs.mkdirSync(duckDbPath, { recursive: true });

        // Initialise DuckDB with the specified file path
        const duckDbInstance: DuckDBInstance = await DuckDBInstance.create(path.posix.join(duckDbPath, 'duckdb_io.db'));
        this._duckDbConn = await duckDbInstance.connect();
    }


    // TODO. Deprecate below file io methods
    public createStreamableFile(filePathName: string) {
        return new StreamableFile(fs.createReadStream(filePathName));
    }

    public async readFile(filePathName: string, encoding: 'utf8' = 'utf8') {
        try {
            return await fs.promises.readFile(filePathName, { encoding: encoding })
        } catch (err) {
            throw new Error("Could not read file: " + err);
        }

    }

    public async saveFile(file: Express.Multer.File, filePathName: string) {
        try {
            await fs.promises.writeFile(`${filePathName}`, file.buffer);
        } catch (err) {
            console.error('Could not save file:', err);
            throw new Error("Could not save file: " + err);
        }
    }

    public async deleteFile(filePathName: string) {
        try {
            // Delete the file.
            // TODO. Investigate why sometimes the file is not deleted. Node puts a lock on it.
            await fs.promises.unlink(filePathName);
        } catch (err) {
            //throw new Error("Could not delete user file: " + err);
            console.error("Could not delete file: ", filePathName, err)
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

}
