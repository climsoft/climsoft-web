import { Injectable, StreamableFile } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Database } from "duckdb-async";

@Injectable()
export class FileIOService {
    private _tempFilesFolderPath: string;
    private _duckDb: Database;

    constructor() {
        this.setupFileIO();
    }

    public get tempFilesFolderPath(): string {
        return this._tempFilesFolderPath;
    }

    public get duckDb(): Database {
        return this._duckDb;
    }

    private async setupFileIO() {
        await this.setupTempFolder();
        await this.setupDuckDB();
    }

    private async setupTempFolder(): Promise<void> {
        this._tempFilesFolderPath = path.resolve('./tmp');
        // For windows platform, replace the backslashes with forward slashes.
        this._tempFilesFolderPath = this._tempFilesFolderPath.replaceAll("\\", "\/");
        // Check if the temporary directory exist. 
        try {
            await fs.promises.access(this._tempFilesFolderPath, fs.promises.constants.F_OK)
        } catch (err1) {
            // If it doesn't create the directory.
            try {
                await fs.promises.mkdir(this._tempFilesFolderPath);
            } catch (err2) {
                console.error("Could not create temporary folder: ", err2);
                // TODO. Throw appropriiate error.
                throw new Error("Could not create temporary folder: " + err2);
            }

        }
    }

    private async setupDuckDB() {
        // Initialise DuckDB with the specified file path
        this._duckDb = await Database.create(`${this._tempFilesFolderPath}/duckdb_io.db`);
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
