import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { FlagEnum } from '../enums/flag.enum';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ViewSourceDto } from 'src/metadata/source-specifications/dtos/view-source.dto';
import { ImportSourceTabularParamsDto, DateTimeDefinition, HourDefinition, ValueDefinition } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { StringUtils } from 'src/shared/utils/string.utils';
import { DataStructureTypeEnum, ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { DataSource } from 'typeorm'; 

@Injectable()
export class ObservationImportService {
    private readonly logger = new Logger(ObservationImportService.name);

    private readonly STATION_ID_PROPERTY_NAME: string = 'station_id';
    private readonly ELEMENT_ID_PROPERTY_NAME: string = 'element_id';
    private readonly LEVEL_PROPERTY_NAME: string = 'level';
    private readonly DATE_TIME_PROPERTY_NAME: string = 'date_time';
    private readonly INTERVAL_PROPERTY_NAME: string = 'interval';
    private readonly SOURCE_ID_PROPERTY_NAME: string = 'source_id';
    private readonly VALUE_PROPERTY_NAME: string = 'value';
    private readonly FLAG_PROPERTY_NAME: string = 'flag';
    private readonly COMMENT_PROPERTY_NAME: string = 'comment';
    private readonly ENTRY_USER_ID_PROPERTY_NAME: string = 'entry_user_id';

    constructor(
        private fileIOService: FileIOService,
        private dataSource: DataSource,
        private sourcesService: SourceSpecificationsService,
        private elementsService: ElementsService,
    ) { }

    public async processFileForImportAndSave(sourceId: number, file: Express.Multer.File, userId: number, stationId?: string) {
        try {
            const importFilePathName: string = `${this.fileIOService.apiImportsDir}/user_${userId}_obs_upload_${new Date().getTime()}${path.extname(file.originalname)}`;
            const exportFilePathName: string = `${this.fileIOService.apiImportsDir}/user_${userId}_obs_${new Date().getTime()}_processed.csv`;

            // Save file from memory
            await fs.promises.writeFile(importFilePathName, file.buffer);

            // Then process the import using duckdb
             await this.processFileForImport(sourceId, importFilePathName, exportFilePathName, userId, stationId);

            await this.importProcessedFilesToDatabase([exportFilePathName]);

        } catch (error) {
            console.error('Manual import fail: ', error)
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new BadRequestException(`Failed to import file: ${errorMessage}`);
        }
    }

    public async processFileForImport(sourceId: number, importFilePathName: string, exportFilePathName: string, userId: number, stationId?: string) {
        // Get the source definition using the source id
        const sourceDef = await this.sourcesService.find(sourceId);

        if (sourceDef.sourceType !== SourceTypeEnum.IMPORT) {
            throw new Error('Source is not an import source');
        }

        const importSourceDef = sourceDef.parameters as ImportSourceDto;

        if (importSourceDef.dataStructureType === DataStructureTypeEnum.TABULAR) {
            await this.processTabularSource(sourceDef, importFilePathName, exportFilePathName, userId, stationId);
        } else {
            throw new Error('Source structure not supported yet');
        }
    }

    /**
     * Import processed CSV files to database using PostgreSQL COPY command
     * Uses a staging table approach to handle duplicates efficiently
     */
    public async importProcessedFilesToDatabase(processedFiles: string[]): Promise<void> {
        for (const filePathName of processedFiles) {
            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
                this.logger.log(`Importing file ${filePathName} into database`);
                const dbFilePathName: string = path.join(this.fileIOService.dbImportsDir, path.basename(filePathName)).replaceAll('\\', '\/');

                // Generate a unique staging table name using timestamp
                const stagingTableName = `obs_staging_${Date.now()}`;

                // Step 1: Create temporary staging table (no constraints for fast COPY)
                // Column types match the observations table schema
                const createStagingTableQuery = `
                    CREATE TEMP TABLE ${stagingTableName} (
                        ${this.STATION_ID_PROPERTY_NAME} VARCHAR NOT NULL,
                        ${this.ELEMENT_ID_PROPERTY_NAME} INTEGER NOT NULL,
                        ${this.LEVEL_PROPERTY_NAME} INTEGER NOT NULL,
                        ${this.DATE_TIME_PROPERTY_NAME} TIMESTAMPTZ NOT NULL,
                        ${this.INTERVAL_PROPERTY_NAME} INTEGER NOT NULL,
                        ${this.SOURCE_ID_PROPERTY_NAME} INTEGER NOT NULL,
                        ${this.VALUE_PROPERTY_NAME} DOUBLE PRECISION,
                        ${this.FLAG_PROPERTY_NAME} VARCHAR,
                        ${this.COMMENT_PROPERTY_NAME} VARCHAR,
                        ${this.ENTRY_USER_ID_PROPERTY_NAME} INTEGER NOT NULL
                    ) ON COMMIT DROP;
                `;

                await queryRunner.query(createStagingTableQuery);

                // Step 2: COPY data into staging table (very fast, no constraints)
                const copyQuery = `
                    COPY ${stagingTableName} (${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.LEVEL_PROPERTY_NAME}, ${this.DATE_TIME_PROPERTY_NAME}, ${this.INTERVAL_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME}, ${this.VALUE_PROPERTY_NAME}, ${this.FLAG_PROPERTY_NAME}, ${this.COMMENT_PROPERTY_NAME}, ${this.ENTRY_USER_ID_PROPERTY_NAME})
                    FROM '${dbFilePathName}'
                    WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');
                `;

                await queryRunner.query(copyQuery);

                // Step 3: Insert from staging to observations with ON CONFLICT handling
                // If duplicate exists, update the existing record with new values
                // Cast flag from VARCHAR to observations_flag_enum type
                const upsertQuery = `
                    INSERT INTO observations (${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.LEVEL_PROPERTY_NAME}, ${this.DATE_TIME_PROPERTY_NAME}, ${this.INTERVAL_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME}, ${this.VALUE_PROPERTY_NAME}, ${this.FLAG_PROPERTY_NAME}, ${this.COMMENT_PROPERTY_NAME}, ${this.ENTRY_USER_ID_PROPERTY_NAME})
                    SELECT ${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.LEVEL_PROPERTY_NAME}, ${this.DATE_TIME_PROPERTY_NAME}, ${this.INTERVAL_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME}, ${this.VALUE_PROPERTY_NAME}, ${this.FLAG_PROPERTY_NAME}::observations_flag_enum, ${this.COMMENT_PROPERTY_NAME}, ${this.ENTRY_USER_ID_PROPERTY_NAME}
                    FROM ${stagingTableName}
                    ON CONFLICT (${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.LEVEL_PROPERTY_NAME}, ${this.DATE_TIME_PROPERTY_NAME}, ${this.INTERVAL_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME})
                    DO UPDATE SET
                        ${this.VALUE_PROPERTY_NAME} = EXCLUDED.${this.VALUE_PROPERTY_NAME},
                        ${this.FLAG_PROPERTY_NAME} = EXCLUDED.${this.FLAG_PROPERTY_NAME},
                        ${this.COMMENT_PROPERTY_NAME} = EXCLUDED.${this.COMMENT_PROPERTY_NAME},
                        ${this.ENTRY_USER_ID_PROPERTY_NAME} = EXCLUDED.${this.ENTRY_USER_ID_PROPERTY_NAME};
                `;

                await queryRunner.query(upsertQuery);

                // Step 4: Commit transaction - staging table is automatically dropped (ON COMMIT DROP)
                await queryRunner.commitTransaction();

                this.logger.log(`Successfully imported ${filePathName} into database`);

            } catch (error) {
                // Rollback transaction on error
                await queryRunner.rollbackTransaction();

                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to import file ${filePathName}: ${errorMessage}`);
                throw new Error(`Database import failed for ${path.basename(filePathName)}: ${errorMessage}`);
            } finally {
                // Release the query runner
                await queryRunner.release();
            }
        }
    }


    private async processTabularSource(sourceDef: ViewSourceDto, importFilePathName: string, exportFilePathName: string, userId: number, stationId?: string): Promise<void> {
        const sourceId: number = sourceDef.id;
        const importDef: ImportSourceDto = sourceDef.parameters as ImportSourceDto;
        const tabularDef: ImportSourceTabularParamsDto = importDef.dataStructureParameters as ImportSourceTabularParamsDto;

        const tmpObsTableName: string = path.basename(importFilePathName, path.extname(importFilePathName));
        // Note.
        // `header = false` is important because it makes sure that duckdb uses it's default column names instead of the headers that come with the file.
        // As of 14/01/2026. `strict_mode = false` is important because large files(e.g 60 MB) throw a parse error when imported via duckdb
        const importParams: string[] = ['header = false', `skip = ${tabularDef.rowsToSkip}`, 'all_varchar = true', 'strict_mode = false'];
        if (tabularDef.delimiter) {
            importParams.push(`delim = '${tabularDef.delimiter}'`);
        }

        // Read csv to duckdb for processing. Important to execute this first before altering the columns due to the renaming of the default column names
        const createSQL: string = `CREATE OR REPLACE TABLE ${tmpObsTableName} AS SELECT * FROM read_csv('${importFilePathName}', ${importParams.join(', ')});`;

        //console.log("createSQL: ", createSQL);

        await this.fileIOService.duckDb.run(createSQL);

        let alterSQLs: string;
        // Rename all columns to use the expected suffix column indices
        alterSQLs = await DuckDBUtils.getRenameDefaultColumnNamesSQL(this.fileIOService.duckDb, tmpObsTableName);

        // Add the rest of the columns
        alterSQLs = alterSQLs + this.getAlterStationColumnSQL(tabularDef, tmpObsTableName, stationId);
        alterSQLs = alterSQLs + this.getAlterLevelColumnSQL(tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + this.getAlterIntervalColumnSQL(tabularDef, tmpObsTableName);

        alterSQLs = alterSQLs + this.getAlterCommentColumnSQL(tabularDef, tmpObsTableName);
        // Note, it is important for the element and date time alterations to be last because for multiple elements option, 
        // the column positions are changed when stacking the data into a single element column.
        alterSQLs = alterSQLs + this.getAlterElementColumnSQL(tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + this.getAlterDateTimeColumnSQL(sourceDef, tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + this.getAlterValueColumnSQL(sourceDef, importDef, tabularDef, tmpObsTableName);

        // Add source and user column
        alterSQLs = alterSQLs + `ALTER TABLE ${tmpObsTableName} ADD COLUMN ${this.SOURCE_ID_PROPERTY_NAME} INTEGER DEFAULT ${sourceId};`;
        alterSQLs = alterSQLs + `ALTER TABLE ${tmpObsTableName} ADD COLUMN ${this.ENTRY_USER_ID_PROPERTY_NAME} INTEGER DEFAULT ${userId};`;

        // Remove duplicate values based on composite primary key (station_id, element_id, level, date_time, interval, source_id)
        // Keep the last occurrence of each duplicate
        alterSQLs = alterSQLs + this.getRemoveDuplicatesSQL(tmpObsTableName);

        //console.log("alterSQLs: ", alterSQLs);

        // Execute the duckdb DDL SQL commands
        let startTime = new Date().getTime();
        await this.fileIOService.duckDb.exec(alterSQLs);
        this.logger.log(`DuckDB alters took ${new Date().getTime() - startTime} milliseconds`);

        if (sourceDef.scaleValues) {
            startTime = new Date().getTime();
            // Scale values if indicated, execute the scale values SQL
            await this.fileIOService.duckDb.exec(await this.getScaleValueSQL(tmpObsTableName));
            this.logger.log(`DuckDB scaling took ${new Date().getTime() - startTime} milliseconds`);
        }

        // Get the rows of the columns that match the dto properties
        // Only export the columns needed for PostgreSQL COPY import (exclude entry_datetime as it's auto-generated)
        startTime = new Date().getTime();
        await this.fileIOService.duckDb.exec(`
            COPY (
                SELECT ${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.LEVEL_PROPERTY_NAME}, ${this.DATE_TIME_PROPERTY_NAME},
                       ${this.INTERVAL_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME}, ${this.VALUE_PROPERTY_NAME},
                       ${this.FLAG_PROPERTY_NAME}, ${this.COMMENT_PROPERTY_NAME}, ${this.ENTRY_USER_ID_PROPERTY_NAME}
                FROM ${tmpObsTableName}
            ) TO '${exportFilePathName}' (HEADER, DELIMITER ',');
        `);
        this.logger.log(`DuckDB copy table took ${new Date().getTime() - startTime} milliseconds`);

        startTime = new Date().getTime();
        await this.fileIOService.duckDb.run(`DROP TABLE ${tmpObsTableName};`);
        this.logger.log(`DuckDB drop table took ${new Date().getTime() - startTime} milliseconds`);

    }

    private getAlterStationColumnSQL(source: ImportSourceTabularParamsDto, tableName: string, stationId?: string): string {
        let sql: string;
        if (source.stationDefinition) {
            const stationDefinition = source.stationDefinition;
            // Set the station column name
            sql = `ALTER TABLE ${tableName} RENAME column${stationDefinition.columnPosition - 1} TO ${this.STATION_ID_PROPERTY_NAME};`;

            if (stationDefinition.stationsToFetch) {
                sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.STATION_ID_PROPERTY_NAME, stationDefinition.stationsToFetch, true);
            }

            // Ensure there are no nulls in the station column
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.STATION_ID_PROPERTY_NAME} SET NOT NULL;`;

        } else if (stationId) {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.STATION_ID_PROPERTY_NAME} VARCHAR DEFAULT '${stationId}';`;
        } else {
            throw new Error("Station must be provided");
        }

        return sql;
    }

    private getAlterIntervalColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string;
        if (source.intervalDefinition.columnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.intervalDefinition.columnPosition - 1} TO ${this.INTERVAL_PROPERTY_NAME};`
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.INTERVAL_PROPERTY_NAME} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.INTERVAL_PROPERTY_NAME} TYPE INTEGER;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.INTERVAL_PROPERTY_NAME} INTEGER DEFAULT ${source.intervalDefinition.defaultInterval};`;
        }
        return sql;
    }

    private getAlterLevelColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string;
        if (source.levelColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.levelColumnPosition - 1} TO ${this.LEVEL_PROPERTY_NAME};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.LEVEL_PROPERTY_NAME} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.LEVEL_PROPERTY_NAME} TYPE INTEGER;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.LEVEL_PROPERTY_NAME} INTEGER DEFAULT 0;`;
        }
        return sql;
    }

    private getAlterCommentColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string;
        if (source.commentColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.commentColumnPosition - 1} TO ${this.COMMENT_PROPERTY_NAME};`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
        }
        return sql;
    }

    private getAlterElementColumnSQL(tabularDef: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string = '';
        if (tabularDef.elementDefinition.noElement) {
            const noElement = tabularDef.elementDefinition.noElement

            // Add the element id column with the default element
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} VARCHAR DEFAULT ${noElement.databaseId};`;

        } else if (tabularDef.elementDefinition.hasElement) {
            const hasElement = tabularDef.elementDefinition.hasElement;
            if (hasElement.singleColumn) {
                const singleColumn = hasElement.singleColumn;
                //--------------------------
                // Element column
                sql = `ALTER TABLE ${tableName} RENAME column${singleColumn.elementColumnPosition - 1} TO ${this.ELEMENT_ID_PROPERTY_NAME};`;
                if (singleColumn.elementsToFetch) {
                    sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.ELEMENT_ID_PROPERTY_NAME, singleColumn.elementsToFetch, true);
                }
                //--------------------------
            } else if (hasElement.multipleColumn) {
                const multipleColumn = hasElement.multipleColumn;
                const colNames: string[] = multipleColumn.map(item => (`column${item.columnPosition - 1}`));

                // Stack the data from the multiple element columns. This will create a new table with 2 columns for elements and values
                // Note. Nulls are included because they represent a missing value which a user may have allowed 
                sql = sql + `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName} UNPIVOT INCLUDE NULLS ( ${this.VALUE_PROPERTY_NAME} FOR ${this.ELEMENT_ID_PROPERTY_NAME} IN (${colNames.join(', ')}) );`;

                // Change the values of the element column
                for (const element of multipleColumn) {
                    sql = sql + `UPDATE ${tableName} SET ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.databaseId} WHERE ${this.ELEMENT_ID_PROPERTY_NAME} = 'column${element.columnPosition - 1}';`;
                }
            }

            // Ensure there are no null elements
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} SET NOT NULL;`;

            // Convert the element contents to integers
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} TYPE INTEGER;`;
        }

        return sql;
    }


    private getAlterDateTimeColumnSQL(sourceDef: ViewSourceDto, importDef: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string = '';
        let expectedDatetimeFormat: string;
        const datetimeDefinition: DateTimeDefinition = importDef.datetimeDefinition;
        if (datetimeDefinition.dateTimeInSingleColumn !== undefined) {
            const dateTimeDef = datetimeDefinition.dateTimeInSingleColumn;
            // Rename the date time column
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.columnPosition - 1} TO ${this.DATE_TIME_PROPERTY_NAME};`;

            expectedDatetimeFormat = dateTimeDef.datetimeFormat;

        } else if (datetimeDefinition.dateTimeInTwoColumns !== undefined) {
            const dateTimeDef = datetimeDefinition.dateTimeInTwoColumns;
            // Rename the date and time columns
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.dateColumn.columnPosition - 1} TO date_col;`;
            sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.timeColumn.columnPosition - 1} TO time_col;`;

            // Combine the date and time columns and give the combined column the expected name
            sql = sql + `ALTER TABLE ${tableName} ADD COLUMN combined_date_time_col VARCHAR;`;
            sql = sql + `UPDATE ${tableName} SET combined_date_time_col = date_col || ' ' || time_col;`;
            sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN combined_date_time_col TO ${this.DATE_TIME_PROPERTY_NAME};`;

            expectedDatetimeFormat = `${dateTimeDef.dateColumn.dateFormat} ${dateTimeDef.timeColumn.timeFormat}`;

        } else if (datetimeDefinition.dateTimeInMultipleColumns !== undefined) {
            const dateFormat: string = '%Y-%m-%d';
            let timeFormat: string = '%H:%M:%S';
            const dateTimeInMultiDef = datetimeDefinition.dateTimeInMultipleColumns;

            // Rename the date and time columns
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeInMultiDef.yearColumnPosition - 1} TO year_col;`;
            sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeInMultiDef.monthColumnPosition - 1} TO month_col;`;

            // ---------------------------------------------------------------
            // Get the day columns
            // ---------------------------------------------------------------
            const dayColumns: string[] = dateTimeInMultiDef.dayColumnPosition.split('-');
            if (dayColumns.length === 1) {
                const dayColumnPosition: number = parseInt(dayColumns[0], 10);
                sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${dayColumnPosition - 1} TO day_col;`;
                // Zero-pad the day values to ensure they are two digits (e.g., '1' becomes '01').
                sql = sql + `UPDATE ${tableName} SET day_col = lpad(day_col, 2, '0');`;
            } else {
                const startCol: number = parseInt(dayColumns[0], 10) - 1;
                const endCol: number = parseInt(dayColumns[1], 10) - 1;
                const dayColumnNames: string[] = [];
                for (let i = startCol; i <= endCol; i++) {
                    dayColumnNames.push(`column${i}`);
                }

                // Unpivot the day columns to create 'day_col' and a new 'value' column.
                // Note. Nulls are not included because they represent a non-existsent day like Feb 31st which must be excluded. 
                sql = sql + `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName} UNPIVOT (${this.VALUE_PROPERTY_NAME} FOR day_col IN (${dayColumnNames.join(', ')}));`;

                // Extract the numeric day part from the column name (e.g., 'column5' -> 5) and zero-pad it
                sql = sql + `UPDATE ${tableName} SET day_col = lpad(substr(day_col, 7)::INTEGER - ${startCol} + 1, 2, '0');`;
            }
            // ---------------------------------------------------------------

            // ---------------------------------------------------------------
            // Get the `time_col`
            // ---------------------------------------------------------------
            const hourDefination: HourDefinition = dateTimeInMultiDef.hourDefinition;
            if (hourDefination.timeColumn !== undefined) {
                const timeColumn = hourDefination.timeColumn;
                // Set the time format
                timeFormat = timeColumn.timeFormat;
                sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${timeColumn.columnPosition - 1} TO time_col;`;
            } else if (hourDefination.defaultHour) {
                const strHour: string = `${StringUtils.addLeadingZero(hourDefination.defaultHour)}`;
                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN time_col VARCHAR;`;
                sql = sql + `UPDATE ${tableName} SET time_col = '${strHour}:00:00';`;
            }
            // ---------------------------------------------------------------

            // ---------------------------------------------------------------
            // Create a combined date time column to be used for combining the multiple date time columns
            // Then combine the date and time columns and give the combined column the expected name
            sql = sql + `ALTER TABLE ${tableName} ADD COLUMN combined_date_time_col VARCHAR;`;
            sql = sql + `UPDATE ${tableName} SET combined_date_time_col = year_col || '-' || month_col || '-' || day_col || ' ' || time_col;`;

            // Rename the name of the column to the desired column name.
            sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN combined_date_time_col TO ${this.DATE_TIME_PROPERTY_NAME};`;

            expectedDatetimeFormat = `${dateFormat} ${timeFormat}`;

            // ---------------------------------------------------------------
        } else {
            throw new Error("Date time interpretation not valid");
        }

        // Convert all values to a valid sql timestamp using the format specified 
        // Note, some files can be messy and can hang duckdb when `strptime` is used directly. So always use `try_strptime` to sanitise the file first
        sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = try_strptime(${this.DATE_TIME_PROPERTY_NAME}, '${expectedDatetimeFormat}');`;
        sql = sql + `DELETE FROM ${tableName} WHERE ${this.DATE_TIME_PROPERTY_NAME} IS NULL;`;
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} SET NOT NULL;`;
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} TYPE TIMESTAMP USING strptime(${this.DATE_TIME_PROPERTY_NAME}, '${expectedDatetimeFormat}');`;


        // If date times are not in UTC then convert them to utc
        if (sourceDef.utcOffset > 0) {
            // Subtract the offset to get UTC time. Local time is ahead of UTC, so to move "back" to UTC
            sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} - INTERVAL ${sourceDef.utcOffset} HOUR;`;
        } else if (sourceDef.utcOffset < 0) {
            // Add the offset to get UTC time. Local time is behind UTC, so to move "forward" to UTC
            sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} + INTERVAL ${Math.abs(sourceDef.utcOffset)} HOUR;`;
        }

        // Change the date_time back to varchar while formating the strings to javascript expected iso format e.g `1981-01-01T06:00:00.000Z` as expected by the dto
        //sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} TYPE VARCHAR USING strftime(${this.DATE_TIME_PROPERTY_NAME}::TIMESTAMP, '%Y-%m-%dT%H:%M:%S.%g') || 'Z';`;

        return sql;
    }

    private getAlterValueColumnSQL(sourceDef: ViewSourceDto, importDef: ImportSourceDto, tabularDef: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string = '';

        if (tabularDef.valueDefinition !== undefined) {
            const valueDefinition: ValueDefinition = tabularDef.valueDefinition;
            //--------------------------
            // Value column
            sql = sql + `ALTER TABLE ${tableName} RENAME column${valueDefinition.valueColumnPosition - 1} TO ${this.VALUE_PROPERTY_NAME};`;
            //--------------------------

            //--------------------------
            // Flag column
            if (valueDefinition.flagDefinition !== undefined) {
                const flagDefinition = valueDefinition.flagDefinition;
                sql = sql + `ALTER TABLE ${tableName} RENAME column${flagDefinition.flagColumnPosition - 1} TO ${this.FLAG_PROPERTY_NAME};`;

                if (flagDefinition.flagsToFetch) {
                    sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.FLAG_PROPERTY_NAME, flagDefinition.flagsToFetch, false);
                }

            } else {
                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
            }
            //--------------------------

        } else {
            // Just add the flag column because the value column should have been added when stacking elements of date columns
            sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
        }


        const sourceMissingValueFlags: string = importDef.sourceMissingValueFlags;
        const missingValueFlags: string[] = sourceMissingValueFlags ? sourceMissingValueFlags.split(',').map(f => f.trim()).filter(f => f) : [];

        let missingValueCondition = `${this.VALUE_PROPERTY_NAME} IS NULL`;
        if (missingValueFlags.length > 0) {
            const quotedFlags = missingValueFlags.map(f => `'${f}'`).join(',');
            missingValueCondition = `${missingValueCondition} OR ${this.VALUE_PROPERTY_NAME} IN (${quotedFlags})`;
        }

        if (sourceDef.allowMissingValue) {
            // Set missing flag if missing are allowed to be imported.
            sql = sql + `UPDATE ${tableName} SET ${this.VALUE_PROPERTY_NAME} = NULL, ${this.FLAG_PROPERTY_NAME} = '${FlagEnum.MISSING}' WHERE ${missingValueCondition};`;
        } else {
            // Delete all missing values if not allowed.
            sql = sql + `DELETE FROM ${tableName} WHERE ${missingValueCondition};`;
        }

        // Convert the value column to double. 
        // Note, important to use DOUBLE to align the precision between DuckDB and Node.js (64-bit double-precision floating-point format (IEEE 754))       
        // TODO. As 0f 22/04/2025. There seems to still be precision issues with DOUBLE when getting data via nodejs. 
        // If this still persists try getting the value column as string when getting data via nodejs.
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE_PROPERTY_NAME} TYPE DOUBLE;`;

        return sql;
    }

    private async getScaleValueSQL(tableName: string): Promise<string> {
        const elementIdsToScale: number[] = (await this.fileIOService.duckDb.all(`SELECT DISTINCT ${this.ELEMENT_ID_PROPERTY_NAME} FROM ${tableName};`)).map(item => (item[this.ELEMENT_ID_PROPERTY_NAME]));
        const elements: CreateViewElementDto[] = await this.elementsService.find({ elementIds: elementIdsToScale });
        let scalingSQLs: string = '';
        for (const element of elements) {
            // Only scale elements that have a scaling factor > 0
            if (element.entryScaleFactor) {
                scalingSQLs = scalingSQLs + `UPDATE ${tableName} SET ${this.VALUE_PROPERTY_NAME} = (${this.VALUE_PROPERTY_NAME} / ${element.entryScaleFactor}) WHERE ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.id} AND ${this.VALUE_PROPERTY_NAME} IS NOT NULL;`;
            }
        }
        return scalingSQLs;
    }

    private getRemoveDuplicatesSQL(tableName: string): string {
        // Remove duplicates based on the composite primary key (station_id, element_id, level, date_time, interval, source_id)
        // Keep the last occurrence by using row_number() ordered by rowid in descending order
        // DuckDB automatically assigns a rowid to each row, with later rows having higher rowids
        return `DELETE FROM ${tableName} WHERE rowid IN (
            SELECT rowid FROM (
                SELECT rowid, ROW_NUMBER() OVER (
                    PARTITION BY ${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.LEVEL_PROPERTY_NAME}, ${this.DATE_TIME_PROPERTY_NAME}, ${this.INTERVAL_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME}
                    ORDER BY rowid DESC
                ) as rn
                FROM ${tableName}
            ) WHERE rn > 1
        );`;
    }

}
