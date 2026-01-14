import { Injectable, StreamableFile } from '@nestjs/common';
import os from "os";
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Database } from "duckdb-async";
import { AppConfig } from 'src/app.config';

@Injectable()
export class FileIOService {

    private _duckDb: Database;


    private _tempDir: string;
    private _importsDir: string;
    private _exportsDir: string;

    constructor() {
        this.createWorkingDirs();
    }

    private async createWorkingDirs() {
        this._tempDir = path.join(process.cwd(), 'temp');
        this._importsDir = path.join(process.cwd(), 'temp', 'imports');
        this._exportsDir = path.join(process.cwd(), 'temp', 'exports');

        // Delete the 'temp' directory first if it exists in development mode
        // This prevents DuckDB WAL file corruption issues after NestJS hot reloads
        if (AppConfig.devMode) {
            try {
                await fs.promises.rm(this._tempDir, { recursive: true, force: true });
            } catch (err) {
                // Ignore errors if directory doesn't exist or can't be deleted
                console.warn('Could not delete temp directory:', err);
            }
        }

        await fs.promises.mkdir(this._tempDir, { recursive: true });
        await fs.promises.mkdir(this._importsDir, { recursive: true });
        await fs.promises.mkdir(this._exportsDir, { recursive: true });

        await this.setupDuckDB();
    }



    // public get tempDir(): string {
    //     return this._tempDir;
    // }

    public get apiImportsDir(): string {
        return AppConfig.devMode ? this._importsDir : '/app/imports';
    }

    public get apiExportsDir(): string {
        return AppConfig.devMode ? this._exportsDir : '/app/exports';
    }

    public get dbImportsDir(): string {
        return '/var/lib/postgresql/imports';
    }

    public get dbExportsDir(): string {
        return '/var/lib/postgresql/exports';
    }



    // TODO. Deprecate below

    public get duckDb(): Database {
        return this._duckDb;
    }

    private async setupTempFolder(): Promise<void> {
        this._tempDir = path.resolve('./temp');
        // For windows platform, replace the backslashes with forward slashes.
        this._tempDir = this._tempDir.replaceAll("\\", "\/");
        // Check if the temporary directory exist. 
        try {
            await fs.promises.access(this._tempDir, fs.promises.constants.F_OK)
        } catch (err1) {
            // If it doesn't create the directory.
            try {
                await fs.promises.mkdir(this._tempDir);
            } catch (err2) {
                console.error("Could not create temporary folder: ", err2);
                // TODO. Throw appropriiate error.
                throw new Error("Could not create temporary folder: " + err2);
            }
        }
    }

    private async setupDuckDB() {
        // Initialise DuckDB with the specified file path
        this._duckDb = await Database.create(`${this.apiImportsDir}/duckdb_io.db`);
    }

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
