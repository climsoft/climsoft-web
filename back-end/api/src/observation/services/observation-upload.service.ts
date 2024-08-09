import { Injectable } from '@nestjs/common';


import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ObservationsService } from './observations.service';
import { CreateImportTabularSourceDTO } from 'src/metadata/controllers/sources/dtos/create-import-source-tabular.dto';

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Database } from "duckdb-async";
import { SourcesService } from 'src/metadata/controllers/sources/services/sources.service';
import { CreateImportSourceDTO, FormatEnum, ServerTypeEnum } from 'src/metadata/controllers/sources/dtos/create-import-source.dto';
import { error } from 'node:console';
import { FlagEnum } from '../enums/flag.enum';




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
             const newFileName: string = `${this.tempFilesFolderPath}/user_${userId}_obs_upload_${new Date().getTime()}${path.extname(file.originalname)}`;

        // Save the file to the temporary directory
        try {
            await fs.writeFile(`${newFileName}`, file.buffer);
        } catch (err) {
            throw new Error("Could not save user file: " + err);
        }

        // Get the source definition using the source id
        const sourceDefinition: CreateImportSourceDTO = (await this.sourcesService.find(sourceId)).extraMetadata as CreateImportSourceDTO;

        if (sourceDefinition.serverType === ServerTypeEnum.LOCAL && sourceDefinition.format === FormatEnum.TABULAR) {
            await this.importTabularSource(sourceDefinition as CreateImportTabularSourceDTO, sourceId, newFileName, userId);
        } else {
            throw new Error("Source not supported yet");
        }

        try {
            // Delete the file.
            // TODO. Investigate why sometimes the file is not deleted. Node puts a lock on it.
            //await fs.unlink(newFileName);
        } catch (err) {
            throw new Error("Could not delete user file: " + err);
        }
    }

    private async importTabularSource(source: CreateImportTabularSourceDTO, sourceId: number, fileName: string, userId: number) {
        try {

            console.log("file name:" + fileName)
            
            const tableName: string = path.basename(fileName, path.extname(fileName));
            const importParams: string[] = ['all_varchar = true', 'header = false', `skip = ${source.rowsToSkip}`];

            if (source.delimiter) {
                importParams.push(`delim = '${source.delimiter}'`);
            }


            // await this.db.run(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${fileName}',  ${importParams.join(",")});`);

            // Read csv to duckdb for processing
            let sql: string = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${fileName}',  ${importParams.join(",")});`

            //Add source column
            sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.SOURCEID} INTEGER DEFAULT ${sourceId};`;

            // Add the rest of the columns
            sql = sql + this.alterStationColumn(source, tableName);
            sql = sql + this.alterElevationColumn(source, tableName);
            sql = sql + this.alterPeriodColumn(source, tableName);
            sql = sql + this.alterDateTimeColumn(source, tableName);
            sql = sql + this.alterElementAndValueColumn(source, tableName);
            sql = sql + this.alterCommentColumn(source, tableName);

            console.log('Execute: ', sql);

            if (1 == 1) {
                return;
            }


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
            // Set the station column name
            sql = `ALTER TABLE ${tableName} RENAME column${source.stationDefinition.columnPosition - 1} TO ${this.STATIONID};`;

            if (source.stationDefinition.stationsToFetch) {
                // Enclose the source and database ids in single quotes to conform to SQL strings
                const allStationIds: { sourceId: string, databaseId: string }[] = source.stationDefinition.stationsToFetch.map(
                    item => ({ sourceId: `'${item.sourceId}'`, databaseId: `'${item.databaseId}'` }));

                // Delete any record that is not supposed to be fetched.    
                const sourceStationIds: string[] = allStationIds.map(item => (item.sourceId));
                sql = sql + `DELETE FROM ${tableName} WHERE ${this.STATIONID} NOT IN ( ${sourceStationIds.join(', ')} );`

                // Update the source station ids with the equivalent database ids
                for (const station of allStationIds) {
                    sql = sql + `UPDATE ${tableName} SET ${this.STATIONID} = ${station.databaseId} WHERE ${this.STATIONID} = ${station.sourceId};`;
                }
            }

            // Ensure there are no nulls in the station column
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.STATIONID} SET NOT NULL;`;

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
            const noElement = source.elementAndValueDefinition.noElement

            // Rename value column
            sql = `ALTER TABLE ${tableName} RENAME column${noElement.valueColumnPosition - 1} TO ${this.VALUE};`;

            //Add flag column
            if (noElement.flagColumnPosition !== undefined) {
                sql = sql + `ALTER TABLE ${tableName} RENAME column${noElement.flagColumnPosition - 1} TO ${this.FLAG};`;
                // TODO. Should validate the flag at this point, using the flag enumerators??
            } else {
                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG} VARCHAR DEFAULT NULL;`;
            }
        } else if (source.elementAndValueDefinition.hasElement) {
            if (source.elementAndValueDefinition.hasElement.singleColumn) {
                const singleColumn = source.elementAndValueDefinition.hasElement.singleColumn;
                //--------------------------
                // Element column
                sql = `ALTER TABLE ${tableName} RENAME column${singleColumn.elementColumnPosition - 1} TO ${this.ELEMENTID};`;
                if (singleColumn.elementsToFetch) {
                    // Enclose the source and database ids in single quotes to conform to SQL strings
                    const allElementIds: { sourceId: string, databaseId: string }[] = singleColumn.elementsToFetch.map(
                        item => ({ sourceId: `'${item.sourceId}'`, databaseId: `'${item.databaseId}'` }));

                    // Delete any record that is not supposed to be fetched.    
                    const sourceElementIds: string[] = allElementIds.map(item => (item.sourceId));
                    sql = sql + `DELETE FROM ${tableName} WHERE ${this.ELEMENTID} NOT IN ( ${sourceElementIds.join(', ')} );`

                    // Update the source element ids with the equivalent database ids
                    for (const element of allElementIds) {
                        sql = sql + `UPDATE ${tableName} SET ${this.ELEMENTID} = ${element.databaseId} WHERE ${this.ELEMENTID} = ${element.sourceId};`;
                    }
                }
                //--------------------------

                //--------------------------
                // Value column
                sql = sql + `ALTER TABLE ${tableName} RENAME column${singleColumn.valueColumnPosition - 1} TO ${this.VALUE};`;
                //--------------------------

                //--------------------------
                // Flag column
                if (singleColumn.flagColumnPosition !== undefined) {
                    sql = sql + `ALTER TABLE ${tableName} RENAME column${singleColumn.flagColumnPosition - 1} TO ${this.FLAG};`
                    // TODO. Should we validate the flag at this point using the flag enumerators?

                } else {
                    sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG} VARCHAR DEFAULT NULL;`;
                }
                //--------------------------
            } else if (source.elementAndValueDefinition.hasElement.multipleColumn) {
                const multipleColumn = source.elementAndValueDefinition.hasElement.multipleColumn;
                const colNames: string[] = multipleColumn.map(item => (`column${item.columnPosition - 1}`));

                // Stack the data from the multiple element columns. This will create a new table with 2 columns for elements and values
                const tableNameStacked = `${tableName}_stacked`;
                sql = sql + `CREATE OR REPLACE TABLE ${tableNameStacked} AS SELECT * FROM ${tableName} UNPIVOT ( ${this.VALUE} FOR ${this.ELEMENTID} IN (${colNames.join(', ')}) );`;

                // Drop previous unstacked table table
                sql = sql + `DROP TABLE ${tableName};`;

                // Change the stacked table name to correct name
                sql = sql + `ALTER TABLE ${tableNameStacked} RENAME TO ${tableName};`;

                // Change the values of the element column
                for (const element of multipleColumn) {
                    sql = sql + `UPDATE ${tableName} SET ${this.ELEMENTID} = ${element.databaseId} WHERE ${this.ELEMENTID} = 'column${element.columnPosition - 1}';`
                }

            }

            // Ensure there are no null elements
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENTID} SET NOT NULL;`;

            // Convert the element contents to integers
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENTID} TYPE INTEGER;`;

            // Add flag column
            sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG} VARCHAR DEFAULT NULL;`;

        }

        const missingValueFlagDefinition =  source.missingValueFlagDefinition
        if (missingValueFlagDefinition.importMissingValue) {
            // Set missing flag if missing are allowed to be imported.
            sql = sql + `UPDATE ${tableName} SET ${this.VALUE} = NULL, ${this.FLAG} = ${FlagEnum.MISSING} WHERE ${this.VALUE} = '${missingValueFlagDefinition.missingValueFlag}';`;
        } else {
            // Delete all missing values if not allowed.
            sql = sql + `DELETE FROM ${tableName} WHERE ${this.VALUE} = NULL OR ${this.VALUE} = '${missingValueFlagDefinition.missingValueFlag}'`;
        }

        // Convert the value column to decimals       
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE} TYPE REAL;`;

        return sql;

    }

    private alterPeriodColumn(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string;
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
        let sql: string;
        if (source.elevationColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.elevationColumnPosition - 1} TO ${this.ELEVATION};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEVATION} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEVATION} TYPE REAL;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.ELEVATION} REAL DEFAULT 0;`;
        }
        return sql;
    }

    private alterDateTimeColumn(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";
        if (source.datetimeDefinition.dateTimeColumnPostion !== undefined) {
            // Rename the date time column
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${source.datetimeDefinition.dateTimeColumnPostion - 1} TO ${this.DATETIME};`;
            // Make sure there are no null values on the column
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATETIME} SET NOT NULL;`;
            // Convert all values to a valid sql timestamp that ignores the microseconds
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATETIME} TYPE TIMESTAMP_S;`;
        } else if (source.datetimeDefinition.dateTimeInMultipleColumn) {
            if (source.datetimeDefinition.dateTimeInMultipleColumn.dateInSingleColumn) {
            } else if (source.datetimeDefinition.dateTimeInMultipleColumn.dateInMultipleColumn) {
            }

            if (source.datetimeDefinition.dateTimeInMultipleColumn.hourDefinition.columnPosition !== undefined) {
            } else if (source.datetimeDefinition.dateTimeInMultipleColumn.hourDefinition.defaultHour !== undefined) {
            }
        }

        if (!sql) {
            throw new Error("Date time interpretation not valid");
        }

        // If date times are not in UTC then convert them to utc
        if (source.utcDifference > 0) {
            sql = sql + `UPDATE ${tableName} SET ${this.DATETIME} = ${this.DATETIME} + INTERVAL ${source.utcDifference} HOUR;`;
        } else if (source.utcDifference < 0) {
            sql = sql + `UPDATE ${tableName} SET ${this.DATETIME} = ${this.DATETIME} - INTERVAL ${Math.abs(source.utcDifference)} HOUR;`;
        }

        return sql;
    }

    private alterCommentColumn(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string;
        if (source.commentColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.commentColumnPosition - 1} TO ${this.COMMENT};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.COMMENT} TYPE VARCHAR;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT} VARCHAR DEFAULT NULL;`;
        }
        return sql;
    }



}
