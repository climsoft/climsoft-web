import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ObservationsService } from './observations.service';
import { SourceTemplatesService } from 'src/metadata/source-templates/services/source-templates.service';
import { FlagEnum } from '../enums/flag.enum';
import { ElementsService } from 'src/metadata/elements/services/elements.service';

//import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CreateImportSourceDTO, DataStructureTypeEnum } from 'src/metadata/source-templates/dtos/create-import-source.dto';
import { ViewSourceDto } from 'src/metadata/source-templates/dtos/view-source.dto';
import { CreateImportTabularSourceDTO } from 'src/metadata/source-templates/dtos/create-import-source-tabular.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { SourceTypeEnum } from 'src/metadata/source-templates/enums/source-type.enum';

@Injectable()
export class ObservationImportService {
    private readonly logger = new Logger(ObservationImportService.name);
    // Enforce these fields to always match CreateObservationDto properties naming. Important to ensure objects returned by duckdb matches the dto structure. 
    private readonly STATION_ID_PROPERTY_NAME: keyof CreateObservationDto = "stationId";
    private readonly ELEMENT_ID_PROPERTY_NAME: keyof CreateObservationDto = "elementId";
    private readonly SOURCE_ID_PROPERTY_NAME: keyof CreateObservationDto = "sourceId";
    private readonly level: keyof CreateObservationDto = "level";
    private readonly DATE_TIME_PROPERTY_NAME: keyof CreateObservationDto = "datetime";
    private readonly INTERVAL_PROPERTY_NAME: keyof CreateObservationDto = "interval";
    private readonly VALUE_PROPERTY_NAME: keyof CreateObservationDto = "value";
    private readonly FLAG_PROPERTY_NAME: keyof CreateObservationDto = "flag";
    private readonly COMMENT_PROPERTY_NAME: keyof CreateObservationDto = "comment";

    constructor(
        private fileIOService: FileIOService,
        private sourcesService: SourceTemplatesService,
        private observationsService: ObservationsService,
        private elementsService: ElementsService,
    ) { }

    public async processFile(sourceId: number, file: Express.Multer.File, userId: number, username: string, stationId?: string) {
        // TODO. Temporarily added the time as part of file name because of deleting the file throgh fs.unlink() throw a bug
        const tmpFilePathName: string = `${this.fileIOService.tempFilesFolderPath}/user_${userId}_obs_upload_${new Date().getTime()}${path.extname(file.originalname)}`;

        // Save the file to the temporary directory
        await this.fileIOService.saveFile(file, tmpFilePathName);

        try {
            // Get the source definition using the source id
            const sourceDef = await this.sourcesService.find(sourceId);

            if (sourceDef.sourceType !== SourceTypeEnum.IMPORT) {
                throw new BadRequestException("Error: Source is not an import source");
            }

            const importSourceDef = sourceDef.parameters as CreateImportSourceDTO;

            if (importSourceDef.dataStructureType === DataStructureTypeEnum.TABULAR) {
                await this.importTabularSource(sourceDef, tmpFilePathName, userId, username, stationId);
            } else {
                throw new BadRequestException("Error: Source not supported yet");
            }

        } catch (error) {
            console.error("File Import Failed: ", error)
            throw new BadRequestException("Error: File Import Failed: " + error);
        } finally {
            this.fileIOService.deleteFile(tmpFilePathName);
        }
    }

    private async importTabularSource(sourceDef: ViewSourceDto, fileName: string, userId: number, username: string, stationId?: string) {
        const sourceId: number = sourceDef.id;
        const importDef: CreateImportSourceDTO = sourceDef.parameters as CreateImportSourceDTO;
        const tabularDef: CreateImportTabularSourceDTO = importDef.dataStructureParameters as CreateImportTabularSourceDTO;

        const tmpObsTableName: string = path.basename(fileName, path.extname(fileName));
        // Note, 'header = false' is important because it makes sure that duckdb uses it's default column names instead of the headers that come with the file.
        const importParams: string[] = ['header = false', `skip = ${tabularDef.rowsToSkip}`, 'all_varchar = true'];
        if (tabularDef.delimiter) {
            importParams.push(`delim = '${tabularDef.delimiter}'`);
        }

        // Read csv to duckdb for processing. Important to execute this first before altering the columns due to the renaming of the default column names
        await this.fileIOService.duckDb.run(`CREATE OR REPLACE TABLE ${tmpObsTableName} AS SELECT * FROM read_csv('${fileName}',  ${importParams.join(",")});`);

        let alterSQLs: string;
        // Rename all columns to use the expected suffix column indices
        alterSQLs = await DuckDBUtils.getRenameDefaultColumnNamesSQL(this.fileIOService.duckDb, tmpObsTableName);

        // Add source column
        alterSQLs = alterSQLs + `ALTER TABLE ${tmpObsTableName} ADD COLUMN ${this.SOURCE_ID_PROPERTY_NAME} INTEGER DEFAULT ${sourceId};`;

        // Add the rest of the columns
        alterSQLs = alterSQLs + this.getAlterStationColumnSQL(tabularDef, tmpObsTableName, stationId);
        alterSQLs = alterSQLs + this.getAlterLevelColumnSQL(tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + this.getAlterIntervalColumnSQL(tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + this.getAlterDateTimeColumnSQL(sourceDef, tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + this.getAlterCommentColumnSQL(tabularDef, tmpObsTableName);
        // Note, it is important for the element and value alterations to be last because for multiple elements option, 
        // the column positions are changed when stacking the data into a single element column.
        alterSQLs = alterSQLs + this.getAlterElementAndValueColumnSQL(sourceDef, importDef, tabularDef, tmpObsTableName);

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
        startTime = new Date().getTime();
        const rows = await this.fileIOService.duckDb.all(`SELECT ${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME}, ${this.level}, ${this.DATE_TIME_PROPERTY_NAME}, ${this.INTERVAL_PROPERTY_NAME}, ${this.VALUE_PROPERTY_NAME}, ${this.FLAG_PROPERTY_NAME}, ${this.COMMENT_PROPERTY_NAME} FROM ${tmpObsTableName};`);
        this.logger.log(`DuckDB fetch rows took ${new Date().getTime() - startTime} milliseconds`);

        // Delete the table 
        startTime = new Date().getTime();
        await this.fileIOService.duckDb.run(`DROP TABLE ${tmpObsTableName};`);
        this.logger.log(`DuckDB drop table took ${new Date().getTime() - startTime} milliseconds`);

        // Save the rows into the database
        // TODO. Note, no need await. All current active ingestion processes will be tagged and show on the ingestion monitoring page
        this.observationsService.bulkPut(rows as CreateObservationDto[], userId);
    }

    private getAlterStationColumnSQL(source: CreateImportTabularSourceDTO, tableName: string, stationId?: string): string {
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

    private getAlterElementAndValueColumnSQL(sourceDef: ViewSourceDto, importDef: CreateImportSourceDTO, tabularDef: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";
        if (tabularDef.elementAndValueDefinition.noElement) {
            const noElement = tabularDef.elementAndValueDefinition.noElement

            // Add the element id column with the default element
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} VARCHAR DEFAULT ${noElement.databaseId};`;

            // Rename value column
            sql = sql + `ALTER TABLE ${tableName} RENAME column${noElement.valueColumnPosition - 1} TO ${this.VALUE_PROPERTY_NAME};`;

            // Add flag column
            if (noElement.flagDefinition) {
                const flagDefinition = noElement.flagDefinition;
                sql = sql + `ALTER TABLE ${tableName} RENAME column${flagDefinition.flagColumnPosition - 1} TO ${this.FLAG_PROPERTY_NAME};`;

                if (flagDefinition.flagsToFetch) {
                    sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.FLAG_PROPERTY_NAME, flagDefinition.flagsToFetch, false);
                }

            } else {
                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
            }
        } else if (tabularDef.elementAndValueDefinition.hasElement) {
            const hasElement = tabularDef.elementAndValueDefinition.hasElement;
            if (hasElement.singleColumn) {
                const singleColumn = hasElement.singleColumn;
                //--------------------------
                // Element column
                sql = `ALTER TABLE ${tableName} RENAME column${singleColumn.elementColumnPosition - 1} TO ${this.ELEMENT_ID_PROPERTY_NAME};`;
                if (singleColumn.elementsToFetch) {
                    sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.ELEMENT_ID_PROPERTY_NAME, singleColumn.elementsToFetch, true);
                }
                //--------------------------

                //--------------------------
                // Value column
                sql = sql + `ALTER TABLE ${tableName} RENAME column${singleColumn.valueColumnPosition - 1} TO ${this.VALUE_PROPERTY_NAME};`;
                //--------------------------

                //--------------------------
                // Flag column
                if (singleColumn.flagDefinition !== undefined) {
                    const flagDefinition = singleColumn.flagDefinition;
                    sql = sql + `ALTER TABLE ${tableName} RENAME column${flagDefinition.flagColumnPosition - 1} TO ${this.FLAG_PROPERTY_NAME};`;

                    if (flagDefinition.flagsToFetch) {
                        sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.FLAG_PROPERTY_NAME, flagDefinition.flagsToFetch, false);
                    }

                } else {
                    sql = sql + `ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
                }
                //--------------------------
            } else if (hasElement.multipleColumn) {
                const multipleColumn = hasElement.multipleColumn;
                const colNames: string[] = multipleColumn.map(item => (`column${item.columnPosition - 1}`));

                // Stack the data from the multiple element columns. This will create a new table with 2 columns for elements and values
                const tableNameStacked = `${tableName}_stacked`;
                sql = sql + `CREATE OR REPLACE TABLE ${tableNameStacked} AS SELECT * FROM ${tableName} UNPIVOT INCLUDE NULLS ( ${this.VALUE_PROPERTY_NAME} FOR ${this.ELEMENT_ID_PROPERTY_NAME} IN (${colNames.join(', ')}) );`;

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

        if (sourceDef.allowMissingValue) {
            // Set missing flag if missing are allowed to be imported.
            sql = sql + `UPDATE ${tableName} SET ${this.VALUE_PROPERTY_NAME} = NULL, ${this.FLAG_PROPERTY_NAME} = '${FlagEnum.MISSING}' WHERE ${this.VALUE_PROPERTY_NAME} IS NULL OR ${this.VALUE_PROPERTY_NAME} = '${importDef.sourceMissingValueFlags}';`;
        } else {
            // Delete all missing values if not allowed.
            sql = sql + `DELETE FROM ${tableName} WHERE ${this.VALUE_PROPERTY_NAME} IS NULL OR ${this.VALUE_PROPERTY_NAME} = '${importDef.sourceMissingValueFlags}';`;
        }

        // Convert the value column to double. 
        // Note, important to use DOUBLE to align the precision between DuckDB and Node.js (64-bit double-precision floating-point format (IEEE 754))       
        // TODO. As 0f 22/04/2025. There seems to still be precision issues with DOUBLE when getting data via nodejs. 
        // If this still persists try getting the value column as string when getting data via nodejs.
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE_PROPERTY_NAME} TYPE DOUBLE;`;

        return sql;
    }

    private getAlterIntervalColumnSQL(source: CreateImportTabularSourceDTO, tableName: string): string {
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

    private getAlterLevelColumnSQL(source: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string;
        if (source.levelColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.levelColumnPosition - 1} TO ${this.level};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.level} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.level} TYPE DOUBLE;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.level} DOUBLE DEFAULT 0;`;
        }
        return sql;
    }

    private getAlterDateTimeColumnSQL(sourceDef: ViewSourceDto, importDef: CreateImportTabularSourceDTO, tableName: string): string {
        let sql: string = "";
        if (importDef.datetimeDefinition.dateTimeInSingleColumn !== undefined) {
            const dateTimeDef = importDef.datetimeDefinition.dateTimeInSingleColumn;
            // Rename the date time column
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.columnPosition - 1} TO ${this.DATE_TIME_PROPERTY_NAME};`;

            // Make sure there are no null values on the column
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} SET NOT NULL;`;

            // Convert all values to a valid sql timestamp using the format specified
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} TYPE TIMESTAMP USING strptime(${this.DATE_TIME_PROPERTY_NAME}, '${dateTimeDef.datetimeFormat}');`;
        } else if (importDef.datetimeDefinition.dateTimeInMultipleColumn) {
            const dateTimeDef = importDef.datetimeDefinition.dateTimeInMultipleColumn;
            if (dateTimeDef.dateInSingleColumn && dateTimeDef.timeInSingleColumn) {

                // Rename the date and time column
                sql = `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.dateInSingleColumn.columnPosition - 1} TO date_col;`;

                sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.timeInSingleColumn.columnPosition - 1} TO time_col;`;

                sql = sql + `ALTER TABLE ${tableName} ADD COLUMN combined_date_time_col VARCHAR;`;

                sql = sql + `UPDATE ${tableName} SET combined_date_time_col = date_col || ' ' || time_col;`;

                // Rename the date time column
                sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN combined_date_time_col TO ${this.DATE_TIME_PROPERTY_NAME};`;

                // Make sure there are no null values on the column
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} SET NOT NULL;`;

                // Convert all values to a valid sql timestamp using the format specified
                sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} TYPE TIMESTAMP USING strptime(${this.DATE_TIME_PROPERTY_NAME}, '${dateTimeDef.dateInSingleColumn.dateFormat} ${dateTimeDef.timeInSingleColumn.timeFormat}');`;


            } else if (dateTimeDef.dateInMultipleColumn) { 

            }

            if (dateTimeDef.hourDefinition.columnPosition !== undefined) {

            } else if (dateTimeDef.hourDefinition.defaultHour !== undefined) {
            }
        }

        if (!sql) {
            throw new Error("Date time interpretation not valid");
        }

        // If date times are not in UTC then convert them to utc
        if (sourceDef.utcOffset > 0) {
            // Subtract the offset to get UTC time. Local time is ahead of UTC, so to move "back" to UTC
            sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} - INTERVAL ${sourceDef.utcOffset} HOUR;`;
        } else if (sourceDef.utcOffset < 0) {
            // Add the offset to get UTC time. Local time is behind UTC, so to move "forward" to UTC
            sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} + INTERVAL ${Math.abs(sourceDef.utcOffset)} HOUR;`;
        }

        // change the date_time back to varchar while formating the strings to javascript expected iso format e.g `1981-01-01T06:00:00.000Z` as expected by the dto
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} TYPE VARCHAR USING strftime(${this.DATE_TIME_PROPERTY_NAME}::TIMESTAMP, '%Y-%m-%dT%H:%M:%S.%g') || 'Z';`;

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

}
