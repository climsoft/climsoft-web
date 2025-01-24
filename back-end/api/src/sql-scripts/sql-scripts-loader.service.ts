import { Injectable } from '@nestjs/common';
import * as path from 'node:path';
import { FileIOService } from 'src/shared/services/file-io.service';
import { DataSource } from 'typeorm';

@Injectable()
export class SqlScriptsLoaderService {

    private readonly DEFAULTS_SCRIPTS_DIR_NAME: string = 'default-triggers';
    private readonly LOG_SCRIPTS_DIR_NAME: string = 'logging-triggers';


    constructor(
        private dataSource: DataSource,
        private fileIOService: FileIOService,) { }

         /**
     * Used by the migrations service
     */
     public async addEntryDatetimeTriggerToDB() {
        try {
            // Get the script directory from absolute path of this service file
            const scriptsDirPath: string = path.dirname(__filename);

            // Get the observation log absolute file path name. For windows platform, replace the backslashes with forward slashes.
            const scriptFilePathAndName: string = path.join(scriptsDirPath, this.DEFAULTS_SCRIPTS_DIR_NAME, 'default-entry-date-time.sql').replaceAll("\\", "\/");
            const sql: string = await this.fileIOService.readFile(`${scriptFilePathAndName}`, 'utf8');

            // TODO. Later add other log triggers

            await this.dataSource.query(sql);
        } catch (error) {
            console.error('Developer error in adding entry date time triggers: ', error);
            throw new Error(error);
        }
    }

    /**
     * Used by the migrations service
     */
    public async addLogsTriggersToDB() {
        try {
            // Get the script directory from absolute path of this service file
            const scriptsDirPath: string = path.dirname(__filename);

            // Get the observation log absolute file path name. For windows platform, replace the backslashes with forward slashes.
            const obsLogFilePathAndName: string = path.join(scriptsDirPath, this.LOG_SCRIPTS_DIR_NAME, 'observation-log.sql').replaceAll("\\", "\/");
            const sql: string = await this.fileIOService.readFile(`${obsLogFilePathAndName}`, 'utf8');

            // TODO. Later add other log triggers

            await this.dataSource.query(sql);
        } catch (error) {
            console.error('Developer error in adding logs triggers: ', error);
            throw new Error(error);
        }

    }

    

}