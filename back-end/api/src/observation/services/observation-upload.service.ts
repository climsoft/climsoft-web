import { Injectable } from '@nestjs/common';


import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ObservationsService } from './observations.service';
import { CreateImportTabularSourceDTO } from 'src/metadata/controllers/sources/dtos/create-import-source-tabular.dto';

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Database } from "duckdb-async";
import { SourcesService } from 'src/metadata/controllers/sources/services/sources.service';
import { CreateImportSourceDTO } from 'src/metadata/controllers/sources/dtos/create-import-source.dto';




@Injectable()
export class ObservationUploadService {

    private db: Database;
    private tempFilesFolderPath: string;
    // Enforce these fields to always match CreateObservationDto properties naming. Important to ensure objects returned by duckdb matches the dto structure. 
    private readonly STATIONID: keyof CreateObservationDto = "stationId";
    private readonly ELEMENTID: keyof CreateObservationDto = "elementId";
    private readonly SOURCEID: keyof CreateObservationDto = "sourceId";
    private readonly ELEVATION: keyof CreateObservationDto = "elevation";
    private readonly DATETIME: keyof CreateObservationDto = "datetime";
    private readonly PERIOD: keyof CreateObservationDto = "period";
    private readonly VALUE: keyof CreateObservationDto = "value";
    private readonly FLAG: keyof CreateObservationDto = "flag";
    private readonly COMMENT: keyof CreateObservationDto = "comment";

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

        // TODO. Temporarily added the time as part of file name because of deleting the file throgh fs.unlink() threw a bug
        const newFileName: string = `${this.tempFilesFolderPath}/user_${userId}_obs_upload_${new Date().getTime()}_${path.extname(file.originalname)}`;

        // Save the file to the temporary directory
        try {
            await fs.writeFile(`${newFileName}`, file.buffer);
        } catch (err) {
            throw new Error("Could not save user file: " + err);
        }

        // Get the source definition using the source id
        const sourceDefinition: CreateImportSourceDTO = (await this.sourcesService.find(sourceId)).extraMetadata as CreateImportSourceDTO;

        if (sourceDefinition.format === "TABULAR") {
            await this.importTabularSource(sourceDefinition as CreateImportTabularSourceDTO, sourceId, newFileName, userId);
        } else {
            throw new Error("Source not supported yet");
        }

        try {
            // Delete the file.
            // TODO. Investigate why sometimes the file is not deleted. Node puts a lock on it.
            await fs.unlink(newFileName);
        } catch (err) {
            throw new Error("Could not delete user file: " + err);
        }
    }

    private async importTabularSource(source: CreateImportTabularSourceDTO, sourceId: number, fileName: string, userId: number) {
        try {
            const tableName: string = path.basename(fileName, path.extname(fileName));
            const importParams: string[] = ['all_varchar = true', 'header = false', `skip = ${source.rowsToSkip}`];

            if (source.delimiter) {
                importParams.push(`delim = '${source.delimiter}'`);
            }

            await this.db.run(`CREATE TABLE ${tableName} AS SELECT * FROM read_csv('${fileName}',  ${importParams.join(",")})`);

            // Process columns data
            let sql: string;
            //Add source column
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.SOURCEID} INTEGER DEFAULT ${sourceId};`;
            // Add the rest of the columns
            sql = sql + this.alterStationColumn(source, tableName);
            sql = sql + this.alterElementAndValueColumn(source, tableName);
            sql = sql + this.alterPeriodColumn(source, tableName);
            sql = sql + this.alterElevationColumn(source, tableName);
            sql = sql + this.alterDateColumn(source, tableName);
            sql = sql + this.alterCommentColumn(source, tableName);

            const startTime = new Date().getTime();

            await this.db.exec(sql);

            const rows = await this.db.all(`SELECT * FROM ${tableName};`);

            console.log("DuckDB took: ", new Date().getTime() - startTime);

            try {
                await this.observationsService.save(rows as CreateObservationDto[], userId);
            } catch (err) {
                throw new Error("Import save error: " + err);
            }


            // Delete the table 
            await this.db.run(`DROP TABLE ${tableName};`);


        } catch (error) {
            throw new Error("Import(DuckDB level) error : " + error);
        }

    }

    private alterStationColumn(source: CreateImportTabularSourceDTO, tableName: string, defaultStationId?: string): string {

        let sql: string;

        if (source.stationDefinition) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.stationDefinition.columnPosition - 1} TO ${this.STATIONID};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.STATIONID} SET NOT NULL;`;

            if (source.stationDefinition.stationsToFetch) {
                // TODO. SQL for getting the stations to fetch only.
            }

        } else if (defaultStationId) {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.STATIONID} VARCHAR DEFAULT ${defaultStationId};`;
        } else {
            throw new Error("Station must be provided");
        }

        return sql;

    }


    private alterElementAndValueColumn(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";

        if (source.elementAndValueDefinition.noElement) {

            sql = `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.noElement.valueColumnPosition - 1} TO ${this.VALUE};`;

            if (source.elementAndValueDefinition.noElement.flagColumnPosition !== undefined) {
                sql = sql + `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.noElement.flagColumnPosition - 1} TO ${this.FLAG};`;
                // TODO. Should validate the flag at this point, using the flag enumerators
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.FLAG} SET DEFAULT NULL;`;

            } else {
                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG} VARCHAR DEFAULT NULL;`;
            }


        } else if (source.elementAndValueDefinition.hasElement) {

            if (source.elementAndValueDefinition.hasElement.singleColumn) {

                //--------------------------
                // Element column
                sql = `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.hasElement.singleColumn.elementColumnPosition - 1} TO ${this.ELEMENTID};`;
                if (source.elementAndValueDefinition.hasElement.singleColumn.elementsToFetch) {
                    // TODO. SQL for getting the elements to fetch
                }
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENTID} SET NOT NULL;`;
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENTID} TYPE REAL;`;
                //--------------------------

                //--------------------------
                // Value column
                sql = sql + `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.hasElement.singleColumn.valueColumnPosition - 1} TO ${this.VALUE};`;
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE} SET DEFAULT NULL;`;
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE} TYPE REAL;`;
                //--------------------------

                //--------------------------
                // Flag column
                if (source.elementAndValueDefinition.hasElement.singleColumn.flagColumnPosition !== undefined) {
                    sql = sql + `ALTER TABLE ${tableName} RENAME column${source.elementAndValueDefinition.hasElement.singleColumn.flagColumnPosition - 1} TO ${this.FLAG};`
                    // TODO. Should validate the flag at this point, using the flag enumerators
                    sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.FLAG} SET DEFAULT NULL;`;

                } else {
                    sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG} VARCHAR DEFAULT NULL;`;
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

        if (source.periodDefinition.columnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.periodDefinition.columnPosition - 1} TO ${this.PERIOD};`
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.PERIOD} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.PERIOD} TYPE INTEGER;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.PERIOD} INTEGER DEFAULT ${source.periodDefinition.defaultPeriod};`;
        }

        return sql;

    }

    private alterElevationColumn(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";
        if (source.elevationColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.elevationColumnPosition - 1} TO ${this.ELEVATION};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEVATION} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEVATION} TYPE REAL;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.ELEVATION} REAL DEFAULT 0;`;
        }

        return sql;
    }

    private alterDateColumn(source: CreateImportTabularSourceDTO, tableName: string): string {

        let sql: string = "";
        if (source.datetimeDefinition.dateTimeColumnPostion !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${source.datetimeDefinition.dateTimeColumnPostion - 1} TO ${this.DATETIME};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATETIME} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATETIME} TYPE TIMESTAMP_S;`;

            //TODO. Left here. Convert the datetime.

        } else if (source.datetimeDefinition.dateTimeInMultipleColumn) {

            if (source.datetimeDefinition.dateTimeInMultipleColumn.dateInSingleColumn) {
                // columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInSingleColumn.dateColumnPosition - 1, 0, "date");

            } else if (source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn) {
                // columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.yearColumnPosition - 1, 0, "year");
                //  columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.monthColumnPosition - 1, 0, "month");
                //  columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn.dayColumnPosition - 1, 0, "day");

            }

            if (source.datetimeDefinition.dateTimeInMultipleColumn.hourDefinition.columnPosition !== undefined) {
                //columns.splice(source.datetimeDefinition.dateTimeInMultipleColumn.hourDefinition.columnPosition - 1, 0, "hour");
            }

        }

        return sql;
    }


    private alterCommentColumn(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";
        if (source.commentColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.commentColumnPosition - 1} TO ${this.COMMENT};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.COMMENT} SET DEFAULT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.COMMENT} TYPE VARCHAR;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT} VARCHAR DEFAULT NULL;`;
        }

        return sql;
    }



}
