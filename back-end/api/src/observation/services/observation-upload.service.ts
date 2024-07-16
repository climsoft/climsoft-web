import { Injectable } from '@nestjs/common';


import { CreateObservationDto } from '../dtos/create-observation.dto'; 
import { ObservationsService } from './observations.service'; 
import { CreateImportTabularSourceDTO } from 'src/metadata/controllers/sources/dtos/create-import-source-tabular.dto';

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Database } from "duckdb-async";
import { SourcesService } from 'src/metadata/controllers/sources/services/sources.service'; 
import { CreateImportSourceDTO } from 'src/metadata/controllers/sources/dtos/create-import-source.dto';


interface UploadedObservationDto extends CreateObservationDto {
    status: 'NEW' | 'UPDATE' | 'SAME' | 'INVALID';
}

@Injectable()
export class ObservationUploadService {

    private db: Database;
    private tempFilesFolderPath: string;

    constructor(
        private observationsService: ObservationsService,
        private sourcesService: SourcesService) {

        this.setupDuckDB();
        this.setupFolder();

    }

    async setupFolder(): Promise<void> {
        this.tempFilesFolderPath = path.resolve('./tmp');
        // For windows platform, replace the backslashes with forward slashes.
        this.tempFilesFolderPath = this.tempFilesFolderPath.replaceAll("\\", "\/");
        // Check if the temporary directory exist. 
        try {
            await fs.access(this.tempFilesFolderPath, fs.constants.F_OK)
        } catch (err1) {
            // If it doesn't create the directory.
            try {
                await fs.mkdir(this.tempFilesFolderPath);
            } catch (err2) {
                console.error("Could not create temporary folder: ", err2);
                // TODO. Throw appropriiate error.
                throw err2;
            }

        }

    }

    async setupDuckDB() {
        this.db = await Database.create(":memory:");
    }

    async processFile(sourceId: number, file: Express.Multer.File, userId: number) {

        const newFileName: string = `${this.tempFilesFolderPath}/user_${userId}_observations_upload${path.extname(file.originalname)}`;

        // Save the file to the temporary directory
        try {
            await fs.writeFile(`${newFileName}`, file.buffer);
        } catch (err) {
            console.error('Could not save user file', err);
            // TODO. Through an error.
            throw new Error("Could not save user file");
        }

        // Get the source definition using the source id
        const sourceDefinition: CreateImportSourceDTO = (await this.sourcesService.find(sourceId)).extraMetadata as CreateImportSourceDTO;

        if (sourceDefinition.format === "TABULAR") {
            this.importTabularSource(sourceDefinition as CreateImportTabularSourceDTO, newFileName);
        } else {
            console.error('Source not supported yet');
            // TODO. Throw correct error.
            throw new Error("Source not supported yet");
        }

        return JSON.stringify('success');
    }


    private async importTabularSource(source: CreateImportTabularSourceDTO, fileName: string) {

        try {
            const tableName: string = path.basename(fileName, path.extname(fileName));
            const importParams: string[] = ['all_varchar = true', 'header = false', `skip = ${source.rowsToSkip}`];

            if (source.delimiter) {
                importParams.push(`delim = '${source.delimiter}'`);
            }

            await this.db.run(`CREATE TABLE ${tableName} AS SELECT * FROM read_csv('${fileName}',  ${importParams.join(",")})`);


            // Process columns data
            let sql: string;
            sql = this.alterStationColumn(source, tableName);
            sql = sql + this.alterElementAndValueColumn(source, tableName);
            sql = sql + this.alterPeriodColumn(source, tableName);
            sql = sql + this.alterElevationColumn(source, tableName);
            sql = sql + this.alterDateColumn(source, tableName);

            console.log('SQL', sql);

            await this.db.exec(sql);

            const colNames = await this.db.all(`DESCRIBE SELECT * FROM ${tableName}`);

            console.log('Column names', colNames)

            //this.db.all(`SELECT * FROM ${tableName}`);
        } catch (error) {
            console.error("Import error: ", error);
            // TODO, Throw correct error 
            throw error;
        }

    }

    private alterStationColumn(source: CreateImportTabularSourceDTO, tableName: string, defaultStationId?: string): string {

        let sql: string;

        if (source.stationDefinition) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.stationDefinition.columnPosition - 1} TO station_id;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN station_id SET NOT NULL;`;

            if (source.stationDefinition.stationsToFetch) {
                // TODO. SQL for getting the stations to fetch only.
            }

        } else if (defaultStationId) {
            sql = `ALTER TABLE ${tableName} ADD COLUMN station_id VARCHAR DEFAULT ${defaultStationId};`;
        } else {
            throw new Error("Station must be provided");
        }

        return sql;

    }


    private alterElementAndValueColumn(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";

        if (source.elementAndValueDefinition.noElement) {

            sql = `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.noElement.valueColumnPosition - 1} TO value;`;

            if (source.elementAndValueDefinition.noElement.flagColumnPosition) {
                sql = sql + `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.noElement.flagColumnPosition - 1} TO flag;`;
            } else {
                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN flag VARCHAR DEFAULT NULL;`;
            }


        } else if (source.elementAndValueDefinition.hasElement) {

            if (source.elementAndValueDefinition.hasElement.singleColumn) {

                //--------------------------
                // Element column
                sql = `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.hasElement.singleColumn.elementColumnPosition - 1} TO element_id;`;
                if (source.elementAndValueDefinition.hasElement.singleColumn.elementsToFetch) {
                    // TODO. SQL for getting the elements to fetch
                }
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN element_id SET NOT NULL;`;
                sql = sql + `ALTER TABLE ${tableName} ALTER element_id TYPE REAL;`;
                //--------------------------

                //--------------------------
                // Value column
                sql = sql + `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.hasElement.singleColumn.valueColumnPosition - 1} TO value;`;
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN value SET DEFAULT NULL;`;
                sql = sql + `ALTER TABLE ${tableName} ALTER value TYPE REAL;`;
                //--------------------------

                //--------------------------
                // Flag column
                if (source.elementAndValueDefinition.hasElement.singleColumn.flagColumnPosition) {
                    sql = sql + `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.hasElement.singleColumn.flagColumnPosition - 1} TO flag;`
                } else {
                    sql = sql + `ALTER TABLE ${tableName} ADD COLUMN flag VARCHAR DEFAULT NULL;`;
                }
                //--------------------------



            } else if (source.elementAndValueDefinition.hasElement.multipleColumn) {
                // TODO. Write sql for stacking the multiple element column values
                for (const el of source.elementAndValueDefinition.hasElement.multipleColumn) {
                    //columns.splice(el.columnPosition - 1, 0, el.databaseId + "");
                }
            }


        }

        return sql;

    }

    private alterPeriodColumn(source: CreateImportTabularSourceDTO, tableName: string): string {

        let sql: string = "";

        if (source.periodDefinition.columnPosition) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.periodDefinition.columnPosition - 1} TO period;`
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN period SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER period TYPE INTEGER;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN period INTEGER DEFAULT ${source.periodDefinition.defaultPeriod};`;
        }

        return sql;

    }

    private  alterElevationColumn(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";
        if (source.elevationColumnPosition) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.elevationColumnPosition - 1} TO elevation;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN elevation SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER elevation REAL INTEGER;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN elevation REAL DEFAULT 0;`;
        }

        return sql;
    }

    private alterDateColumn(source: CreateImportTabularSourceDTO, tableName: string): string {

        let sql: string = "";
        if (source.datetimeDefinition.dateTimeColumnPostion !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.datetimeDefinition.dateTimeColumnPostion - 1} TO date_time;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN date_time SET NOT NULL;`;

            //TODO. Left here. Convert the datetime.

        } else if (source.datetimeDefinition.dateTimeInMultipleColumn) {

            if (source.datetimeDefinition.dateTimeInMultipleColumn.dateInSingleColumn) {
                // columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInSingleColumn.dateColumnPosition - 1, 0, "date");

            } else if (source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn) {
                // columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.yearColumnPosition - 1, 0, "year");
                //  columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.monthColumnPosition - 1, 0, "month");
                //  columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.dayColumnPosition - 1, 0, "day");

            }

            if (source.datetimeDefinition.dateTimeInMultipleColumn.hourDefinition.columnPosition) {
                //columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.hourDefinition.columnPosition - 1, 0, "hour");
            }

        }

        return sql;
    }



}
