import { Injectable } from '@nestjs/common';
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

    public getFullFolderPath(folder: string): string {

        //const fullFolderPath = path.join(process.cwd(), 'sql-scripts/observation_log.sql');

        //console.log('dir: ', __dirname);
        //console.log('process.cwd(): ', process.cwd());
        //console.log('Join file path: ', fullFolderPath);

        // Define paths for both development and production environments
        const devPath = path.join(process.cwd(), 'api', 'src', 'sql-scripts', 'update_observations_log_column.sql');
        const prodPath = path.join(process.cwd(), 'dist', 'sql-scripts', 'update_observations_log_column.sql');

        // Determine the actual path to use based on environment
        const filePath = fs.existsSync(devPath) ? devPath : prodPath;

        console.log('filePath: ', filePath);

        // For windows platform, replace the backslashes with forward slashes.
        return path.resolve(`./${folder}`).replaceAll("\\", "\/");


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

    public createReadStream(filePathName: string) {
        return fs.createReadStream(filePathName);
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

}
