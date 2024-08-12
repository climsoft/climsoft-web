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
import { ElementsService } from 'src/metadata/services/elements/elements.service';
import { ViewElementDto } from 'src/metadata/dtos/elements/view-element.dto';




@Injectable()
export class ObservationUploadService {
    private db: Database;
    private tempFilesFolderPath: string;
    // Enforce these fields to always match CreateObservationDto properties naming. Important to ensure objects returned by duckdb matches the dto structure. 
    private readonly STATION_ID_PROPERTY_NAME: keyof CreateObservationDto = "stationId";
    private readonly ELEMENT_ID_PROPERTY_NAME: keyof CreateObservationDto = "elementId";
    private readonly SOURCE_ID_PROPERTY_NAME: keyof CreateObservationDto = "sourceId";
    private readonly ELEVATION: keyof CreateObservationDto = "elevation";
    private readonly DATE_TIME_PROPERTY_NAME: keyof CreateObservationDto = "datetime";
    private readonly PERIOD_PROPERTY_NAME: keyof CreateObservationDto = "period";
    private readonly VALUE_PROPERTY_NAME: keyof CreateObservationDto = "value";
    private readonly FLAG_PROPERTY_NAME: keyof CreateObservationDto = "flag";
    private readonly COMMENT_PROPERTY_NAME: keyof CreateObservationDto = "comment";

    constructor(
        private sourcesService: SourcesService,
        private observationsService: ObservationsService,
        private elementsService: ElementsService,
    ) {

        this.setupDuckDB();
        this.setupFolder();

    }

    async setupDuckDB() {
        this.db = await Database.create(":memory:");
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
                throw new Error("Could not create temporary folder: " + err2);
            }

        }

    }

  
    async processFile(sourceId: number, file: Express.Multer.File, userId: number) {

        // TODO. Temporarily added the time as part of file name because of deleting the file throgh fs.unlink() throw a bug
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
            await fs.unlink(newFileName);
        } catch (err) {
            //throw new Error("Could not delete user file: " + err);
            console.error("Could not delete user file: " + err)
        }
    }

    private async importTabularSource(source: CreateImportTabularSourceDTO, sourceId: number, fileName: string, userId: number, defaultStationId?: string) {
        try {
            const tableName: string = path.basename(fileName, path.extname(fileName));
            const importParams: string[] = ['all_varchar = true', 'header = false', `skip = ${source.rowsToSkip}`];
            if (source.delimiter) {
                importParams.push(`delim = '${source.delimiter}'`);
            }

            // Read csv to duckdb for processing. Important to execute this first before altering the columns due to the renaming of the default column names
            // TODO. Should we create a temporary table, will it have a significance?
            await this.db.exec(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${fileName}',  ${importParams.join(",")});`);

            let alterSQLs: string;
            // Rename all columns correctly
            alterSQLs = await this.getRenameColumnNamesSQL(tableName);

            // Add source column
            alterSQLs = alterSQLs + `ALTER TABLE ${tableName} ADD COLUMN ${this.SOURCE_ID_PROPERTY_NAME} INTEGER DEFAULT ${sourceId};`;

            // Add the rest of the columns
            alterSQLs = alterSQLs + this.getAlterStationColumnSQL(source, tableName, defaultStationId);
            alterSQLs = alterSQLs + this.getAlterElevationColumnSQL(source, tableName);
            alterSQLs = alterSQLs + this.getAlterPeriodColumnSQL(source, tableName);
            alterSQLs = alterSQLs + this.getAlterDateTimeColumnSQL(source, tableName);
            alterSQLs = alterSQLs + this.getAlterCommentColumnSQL(source, tableName);
            // Note, it is important for the element and value alterations to be last because for multiple elements option, 
            // the column positions are changed when stacking the data into a single element column.
            alterSQLs = alterSQLs + this.getAlterElementAndValueColumnSQL(source, tableName);


            console.log('Execute: ', alterSQLs);
            let startTime = new Date().getTime();
            // Execute the duckdb DDL SQL commands
            await this.db.exec(alterSQLs);
            console.log("DuckDB alters took: ", new Date().getTime() - startTime);

            if (source.scaleValues) {
                startTime = new Date().getTime();
                // Scale values if indicated, execute the scale values SQL
                await this.db.exec(await this.getScaleValueSQL( tableName));
                console.log("DuckDB scaling took: ", new Date().getTime() - startTime);
            }

            startTime = new Date().getTime();
            // Get the rows of the columns that match the dto properties
            const rows = await this.db.all(`SELECT ${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME}, ${this.ELEVATION}, ${this.DATE_TIME_PROPERTY_NAME}, ${this.PERIOD_PROPERTY_NAME}, ${this.VALUE_PROPERTY_NAME}, ${this.FLAG_PROPERTY_NAME}, ${this.COMMENT_PROPERTY_NAME} FROM ${tableName};`);
            console.log("DuckDB fetch rows took: ", new Date().getTime() - startTime);

            try {
                // Save the rows into the database
                await this.observationsService.save(rows as CreateObservationDto[], userId);
            } catch (error) {
                console.error("Saving Data Failed: " + error)
                throw new Error("Saving Data Failed: " + error);
            }


            // Delete the table 
            await this.db.run(`DROP TABLE ${tableName};`);

        } catch (error) {
            console.error("File Import Failed: " + error)
            throw new Error("File Import Failed: " + error);
        }
    }

    private async getRenameColumnNamesSQL(tableName: string): Promise<string> {

        // As of 12/08/2024 DuckDB uses different column suffixes on default column names depending on the number of columns of the csv file imported.
        // For instance, when columns are < 10, then default column name will be 'column0', and when > 10, default column name will be 'column00'.
        // This function aims to ensure that the column names are corrected to the suffix expected, that is, 'column0'  

        const sourceColumnNames: string[] = (await this.db.all(`DESCRIBE ${tableName}`)).map(item => (item.column_name));
        let sql: string = "";
        for (let i = 0; i < sourceColumnNames.length; i++) {
            sql = sql + `ALTER TABLE ${tableName} RENAME ${sourceColumnNames[i]} TO column${i};`;
        }
        return sql;
    }

    private getAlterStationColumnSQL(source: CreateImportTabularSourceDTO, tableName: string, defaultStationId?: string): string {
        let sql: string;
        if (source.stationDefinition) {
            const stationDefinition = source.stationDefinition;
            // Set the station column name
            sql = `ALTER TABLE ${tableName} RENAME column${stationDefinition.columnPosition - 1} TO ${this.STATION_ID_PROPERTY_NAME};`;

            if (stationDefinition.stationsToFetch) {
                // Enclose the source and database ids in single quotes to conform to SQL strings
                const allStationIds: { sourceId: string, databaseId: string }[] = stationDefinition.stationsToFetch.map(
                    item => ({ sourceId: `'${item.sourceId}'`, databaseId: `'${item.databaseId}'` }));

                // Delete any record that is not supposed to be fetched.    
                const sourceStationIds: string[] = allStationIds.map(item => (item.sourceId));
                sql = sql + `DELETE FROM ${tableName} WHERE ${this.STATION_ID_PROPERTY_NAME} NOT IN ( ${sourceStationIds.join(', ')} );`;

                // Update the source station ids with the equivalent database ids
                for (const station of allStationIds) {
                    sql = sql + `UPDATE ${tableName} SET ${this.STATION_ID_PROPERTY_NAME} = ${station.databaseId} WHERE ${this.STATION_ID_PROPERTY_NAME} = ${station.sourceId};`;
                }
            }

            // Ensure there are no nulls in the station column
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.STATION_ID_PROPERTY_NAME} SET NOT NULL;`;

        } else if (defaultStationId) {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.STATION_ID_PROPERTY_NAME} VARCHAR DEFAULT ${defaultStationId};`;
        } else {
            throw new Error("Station must be provided");
        }

        return sql;
    }

    private getAlterElementAndValueColumnSQL(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";
        if (source.elementAndValueDefinition.noElement) {
            const noElement = source.elementAndValueDefinition.noElement

            // Rename value column
            sql = `ALTER TABLE ${tableName} RENAME column${noElement.valueColumnPosition - 1} TO ${this.VALUE_PROPERTY_NAME};`;

            //Add flag column
            if (noElement.flagColumnPosition !== undefined) {
                sql = sql + `ALTER TABLE ${tableName} RENAME column${noElement.flagColumnPosition - 1} TO ${this.FLAG_PROPERTY_NAME};`;
                // TODO. Should validate the flag at this point, using the flag enumerators??
            } else {
                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
            }
        } else if (source.elementAndValueDefinition.hasElement) {
            if (source.elementAndValueDefinition.hasElement.singleColumn) {
                const singleColumn = source.elementAndValueDefinition.hasElement.singleColumn;
                //--------------------------
                // Element column
                sql = `ALTER TABLE ${tableName} RENAME column${singleColumn.elementColumnPosition - 1} TO ${this.ELEMENT_ID_PROPERTY_NAME};`;
                if (singleColumn.elementsToFetch) {
                    // Enclose the source and database ids in single quotes to conform to SQL strings
                    const allElementIds: { sourceId: string, databaseId: string }[] = singleColumn.elementsToFetch.map(
                        item => ({ sourceId: `'${item.sourceId}'`, databaseId: `'${item.databaseId}'` }));

                    // Delete any record that is not supposed to be fetched.    
                    const sourceElementIds: string[] = allElementIds.map(item => (item.sourceId));
                    sql = sql + `DELETE FROM ${tableName} WHERE ${this.ELEMENT_ID_PROPERTY_NAME} NOT IN ( ${sourceElementIds.join(', ')} );`;

                    // Update the source element ids with the equivalent database ids
                    for (const element of allElementIds) {
                        sql = sql + `UPDATE ${tableName} SET ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.databaseId} WHERE ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.sourceId};`;
                    }
                }
                //--------------------------

                //--------------------------
                // Value column
                sql = sql + `ALTER TABLE ${tableName} RENAME column${singleColumn.valueColumnPosition - 1} TO ${this.VALUE_PROPERTY_NAME};`;
                //--------------------------

                //--------------------------
                // Flag column
                if (singleColumn.flagColumnPosition !== undefined) {
                    sql = sql + `ALTER TABLE ${tableName} RENAME column${singleColumn.flagColumnPosition - 1} TO ${this.FLAG_PROPERTY_NAME};`;
                    // TODO. Should we validate the flag at this point using the flag enumerators?
                } else {
                    sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
                }
                //--------------------------
            } else if (source.elementAndValueDefinition.hasElement.multipleColumn) {
                const multipleColumn = source.elementAndValueDefinition.hasElement.multipleColumn;
                const colNames: string[] = multipleColumn.map(item => (`column${item.columnPosition - 1}`));

                // Stack the data from the multiple element columns. This will create a new table with 2 columns for elements and values
                const tableNameStacked = `${tableName}_stacked`;
                sql = sql + `CREATE OR REPLACE TABLE ${tableNameStacked} AS SELECT * FROM ${tableName} UNPIVOT ( ${this.VALUE_PROPERTY_NAME} FOR ${this.ELEMENT_ID_PROPERTY_NAME} IN (${colNames.join(', ')}) );`;

                // Drop previous unstacked table table
                sql = sql + `DROP TABLE ${tableName};`;

                // Change the stacked table name to correct name
                sql = sql + `ALTER TABLE ${tableNameStacked} RENAME TO ${tableName};`;

                // Change the values of the element column
                for (const element of multipleColumn) {
                    sql = sql + `UPDATE ${tableName} SET ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.databaseId} WHERE ${this.ELEMENT_ID_PROPERTY_NAME} = 'column${element.columnPosition - 1}';`;
                }

                // Add flag column
                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;

            }

            // Ensure there are no null elements
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} SET NOT NULL;`;

            // Convert the element contents to integers
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} TYPE INTEGER;`;
        }

        const missingValueFlagDefinition = source.missingValueFlagDefinition;
        if (missingValueFlagDefinition.importMissingValue) {
            // Set missing flag if missing are allowed to be imported.
            sql = sql + `UPDATE ${tableName} SET ${this.VALUE_PROPERTY_NAME} = NULL, ${this.FLAG_PROPERTY_NAME} = '${FlagEnum.MISSING}' WHERE ${this.VALUE_PROPERTY_NAME} IS NULL OR ${this.VALUE_PROPERTY_NAME} = '${missingValueFlagDefinition.missingValueFlag}';`;
        } else {
            // Delete all missing values if not allowed.
            sql = sql + `DELETE FROM ${tableName} WHERE ${this.VALUE_PROPERTY_NAME} IS NULL OR ${this.VALUE_PROPERTY_NAME} = '${missingValueFlagDefinition.missingValueFlag}';`;
        }

        // Convert the value column to decimals       
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE_PROPERTY_NAME} TYPE REAL;`;

        return sql;

    }

    private getAlterPeriodColumnSQL(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string;
        if (source.periodDefinition.columnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.periodDefinition.columnPosition - 1} TO ${this.PERIOD_PROPERTY_NAME};`
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.PERIOD_PROPERTY_NAME} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.PERIOD_PROPERTY_NAME} TYPE INTEGER;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.PERIOD_PROPERTY_NAME} INTEGER DEFAULT ${source.periodDefinition.defaultPeriod};`;
        }
        return sql;
    }

    private getAlterElevationColumnSQL(source: CreateImportTabularSourceDTO, tableName: string): string {
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

    private getAlterDateTimeColumnSQL(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";
        if (source.datetimeDefinition.dateTimeColumnPostion !== undefined) {
            // Rename the date time column
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${source.datetimeDefinition.dateTimeColumnPostion - 1} TO ${this.DATE_TIME_PROPERTY_NAME};`;
            // Make sure there are no null values on the column
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} SET NOT NULL;`;
            // Convert all values to a valid sql timestamp that ignores the microseconds
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} TYPE TIMESTAMP_S;`;
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
            sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} + INTERVAL ${source.utcDifference} HOUR;`;
        } else if (source.utcDifference < 0) {
            sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} - INTERVAL ${Math.abs(source.utcDifference)} HOUR;`;
        }

        return sql;
    }

    private getAlterCommentColumnSQL(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string;
        if (source.commentColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.commentColumnPosition - 1} TO ${this.COMMENT_PROPERTY_NAME};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.COMMENT_PROPERTY_NAME} TYPE VARCHAR;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
        }
        return sql;
    }

    private async getScaleValueSQL( tableName: string): Promise<string> {
        const elementIdsToScale: number[] = (await this.db.all(`SELECT DISTINCT ${this.ELEMENT_ID_PROPERTY_NAME}  FROM ${tableName};`)).map(item => (item[this.ELEMENT_ID_PROPERTY_NAME]));
        const elements: ViewElementDto[] = await this.elementsService.findSome(elementIdsToScale);
        let scalingSQLs: string = ""
        for (const element of elements) {
            // Only scale elements that have a scaling factor > 0 
            if (element.entryScaleFactor) {
                scalingSQLs = scalingSQLs + `UPDATE ${tableName} SET ${this.VALUE_PROPERTY_NAME} = ${this.VALUE_PROPERTY_NAME} / ${element.entryScaleFactor} WHERE ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.id} AND ${this.VALUE_PROPERTY_NAME} IS NOT NULL;`;
            }
        }
        return scalingSQLs;
    }

}
