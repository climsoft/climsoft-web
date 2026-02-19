import { FlagEnum } from '../enums/flag.enum';
import { ImportSourceTabularParamsDto, DateTimeDefinition, HourDefinition, ValueDefinition } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { StringUtils } from 'src/shared/utils/string.utils';
import { CreateSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/create-source-specification.dto';
import { PreviewError } from '../dtos/import-preview.dto';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { DuckDBConnection } from '@duckdb/node-api';

/**
 * Static utility class that builds DuckDB SQL statements for transforming
 * imported tabular data into the observations table schema.
 *
 * Used by both ObservationImportService (actual imports) and ImportPreviewService (live previews).
 */
export class TabularImportTransformer {

    static readonly STATION_ID_PROPERTY_NAME: string = 'station_id';
    static readonly ELEMENT_ID_PROPERTY_NAME: string = 'element_id';
    static readonly LEVEL_PROPERTY_NAME: string = 'level';
    static readonly DATE_TIME_PROPERTY_NAME: string = 'date_time';
    static readonly INTERVAL_PROPERTY_NAME: string = 'interval';
    static readonly SOURCE_ID_PROPERTY_NAME: string = 'source_id';
    static readonly VALUE_PROPERTY_NAME: string = 'value';
    static readonly FLAG_PROPERTY_NAME: string = 'flag';
    static readonly COMMENT_PROPERTY_NAME: string = 'comment';
    static readonly ENTRY_USER_ID_PROPERTY_NAME: string = 'entry_user_id';

    public static async loadTableFromFile(conn: DuckDBConnection, filePathName: string, rowsToSkip: number, maxRows: number, delimiter: string | undefined): Promise<string> {
        // Read CSV with the configured params
        const importParams = DuckDBUtils.buildCsvImportParams(rowsToSkip, delimiter);
        const limitClause = maxRows > 0 ? ` LIMIT ${maxRows}` : '';
        // Remove spaces and special characters from table name to ensure valid SQL identifier
        const tableName: string = DuckDBUtils.getTableNameFromFileName(filePathName);

        // Note: The `read_csv` function in DuckDB automatically infers the column names as "column0", "column1", etc. based on the column positions.
        const createSQL = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${filePathName}', ${importParams.join(', ')})${limitClause};`;

        await conn.run(createSQL);


        // Rename columns to normalized names (column0, column1, ...)
        const renameSQL = await DuckDBUtils.getRenameDefaultColumnNamesSQL(conn, tableName);
        await conn.run(renameSQL);

        return tableName;
    }

    public static async executeTransformation(
        conn: DuckDBConnection,
        tableName: string,
        sourceId: number,
        sourceDef: CreateSourceSpecificationDto,
        elements: CreateViewElementDto[],
        userId: number,
        stationId?: string,
    ): Promise<PreviewError | void> {

        const importDef = sourceDef.parameters as ImportSourceDto;
        const tabularDef = importDef.dataStructureParameters as ImportSourceTabularParamsDto;

        // Execute each transformation step individually.
        // Each step's SQL is built and executed separately so that:
        // 1. If a step fails, previous successful transformations remain visible in the preview
        // 2. The error message tells the user exactly which step failed
        // 3. The user can see partial progress and fix only what's broken

        const steps: { name: string; buildSql: () => string }[] = [
            { name: 'Station', buildSql: () => TabularImportTransformer.buildAlterStationColumnSQL(tabularDef, tableName, stationId) },
            { name: 'Element', buildSql: () => TabularImportTransformer.buildAlterElementColumnSQL(tabularDef, tableName) },
            { name: 'Level', buildSql: () => TabularImportTransformer.buildAlterLevelColumnSQL(tabularDef, tableName) },
            { name: 'Date/Time', buildSql: () => TabularImportTransformer.buildAlterDateTimeColumnSQL(sourceDef, tabularDef, tableName) },
            { name: 'Interval', buildSql: () => TabularImportTransformer.buildAlterIntervalColumnSQL(tabularDef, tableName) },
            { name: 'Value & Flag', buildSql: () => TabularImportTransformer.buildAlterValueColumnSQL(sourceDef, importDef, tabularDef, tableName) },
            {
                name: 'Scale Values',
                buildSql: () => {
                    let sql = '';
                    if (sourceDef.scaleValues) {
                        //const elementIdsToScale: number[] = (await duckDb.all( `SELECT DISTINCT ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME} FROM ${tableName};`   )).map(item => (item[ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME]));
                        //const elements: CreateViewElementDto[] = await elementsService.find({ elementIds: elementIdsToScale });
                        sql += TabularImportTransformer.buildScaleValueSQL(tableName, elements);
                    }
                    return sql;
                }
            },
            { name: 'Comment', buildSql: () => TabularImportTransformer.buildAlterCommentColumnSQL(tabularDef, tableName) },
            {
                name: 'Finalize',
                buildSql: () => {
                    let sql = '';
                    sql += `ALTER TABLE ${tableName} ADD COLUMN ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME} INTEGER DEFAULT ${sourceId};`;
                    sql += `ALTER TABLE ${tableName} ADD COLUMN ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME} INTEGER DEFAULT ${userId};`;
                    sql += TabularImportTransformer.buildRemoveDuplicatesSQL(tableName);
                    return sql;
                }
            },
        ];

        for (const step of steps) {
            try {
                // Build the SQL — this can throw if the config is invalid (e.g. missing required fields)
                const sql = step.buildSql();
                if (sql) {
                    await conn.run(sql);
                }
            } catch (error) {
                // Stop processing — later steps may depend on this one.
                return TabularImportTransformer.classifyDuckDbError(error, step.name);

            }
        }
    }

    public static async exportTransformedDataToFile(conn: DuckDBConnection, tableName: string, exportFilePath: string): Promise<void> {
        // Only export the columns needed for PostgreSQL COPY import (exclude entry_datetime as it's auto-generated)
        await conn.run(`
            COPY (
                SELECT
                    ${TabularImportTransformer.STATION_ID_PROPERTY_NAME},
                    ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME},
                    ${TabularImportTransformer.LEVEL_PROPERTY_NAME},
                    ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME},
                    ${TabularImportTransformer.INTERVAL_PROPERTY_NAME},
                    ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME},
                    ${TabularImportTransformer.VALUE_PROPERTY_NAME},
                    ${TabularImportTransformer.FLAG_PROPERTY_NAME},
                    ${TabularImportTransformer.COMMENT_PROPERTY_NAME},
                    ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME}
                FROM ${tableName}
            ) TO '${exportFilePath}' (HEADER, DELIMITER ',');
        `);
    }

    private static buildScaleValueSQL(tableName: string, elements: CreateViewElementDto[]): string {
        let scalingSQLs: string = '';
        for (const element of elements) {
            if (element.entryScaleFactor) {
                scalingSQLs += `UPDATE ${tableName} SET ${TabularImportTransformer.VALUE_PROPERTY_NAME} = (${TabularImportTransformer.VALUE_PROPERTY_NAME} / ${element.entryScaleFactor}) WHERE ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME} = ${element.id} AND ${TabularImportTransformer.VALUE_PROPERTY_NAME} IS NOT NULL;`;
            }
        }
        return scalingSQLs;
    }

    private static classifyDuckDbError(error: unknown, stepName: string): PreviewError {
        const msg = error instanceof Error ? error.message : String(error);

        if (msg.includes('does not have a column named') || msg.includes('Referenced column') || msg.includes('not found in FROM clause')) {
            return {
                type: 'COLUMN_NOT_FOUND',
                message: `${stepName}: A column referenced in the specification was not found in the uploaded file. Check that the column positions are correct.`,
                detail: msg,
            };
        }

        if (msg.includes('out of range') || msg.includes('Binder Error')) {
            return {
                type: 'INVALID_COLUMN_POSITION',
                message: `${stepName}: A column position is out of range. The file has fewer columns than expected.`,
                detail: msg,
            };
        }

        return {
            type: 'SQL_EXECUTION_ERROR',
            message: `${stepName}: An error occurred while processing the file with the current specification.`,
            detail: msg,
        };
    }

    private static buildAlterStationColumnSQL(source: ImportSourceTabularParamsDto, tableName: string, stationId?: string): string {
        let sql: string;
        if (source.stationDefinition) {
            const stationDefinition = source.stationDefinition;
            // Set the station column name
            sql = `ALTER TABLE ${tableName} RENAME column${stationDefinition.columnPosition} TO ${this.STATION_ID_PROPERTY_NAME};`;

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

    private static buildAlterIntervalColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string;
        if (source.intervalDefinition.columnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.intervalDefinition.columnPosition} TO ${this.INTERVAL_PROPERTY_NAME};`
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.INTERVAL_PROPERTY_NAME} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.INTERVAL_PROPERTY_NAME} TYPE INTEGER;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.INTERVAL_PROPERTY_NAME} INTEGER DEFAULT ${source.intervalDefinition.defaultInterval};`;
        }
        return sql;
    }

    private static buildAlterLevelColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string;
        if (source.levelColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.levelColumnPosition} TO ${this.LEVEL_PROPERTY_NAME};`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.LEVEL_PROPERTY_NAME} SET NOT NULL;`;
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.LEVEL_PROPERTY_NAME} TYPE INTEGER;`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.LEVEL_PROPERTY_NAME} INTEGER DEFAULT 0;`;
        }
        return sql;
    }

    static buildAlterCommentColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string;
        if (source.commentColumnPosition !== undefined) {
            sql = `ALTER TABLE ${tableName} RENAME column${source.commentColumnPosition} TO ${this.COMMENT_PROPERTY_NAME};`;
        } else {
            sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT_PROPERTY_NAME} VARCHAR DEFAULT NULL;`;
        }
        return sql;
    }

    private static buildAlterElementColumnSQL(tabularDef: ImportSourceTabularParamsDto, tableName: string): string {
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
                sql = `ALTER TABLE ${tableName} RENAME column${singleColumn.elementColumnPosition} TO ${this.ELEMENT_ID_PROPERTY_NAME};`;
                if (singleColumn.elementsToFetch) {
                    sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.ELEMENT_ID_PROPERTY_NAME, singleColumn.elementsToFetch, true);
                }
                //--------------------------
            } else if (hasElement.multipleColumn) {
                const multipleColumn = hasElement.multipleColumn;
                const colNames: string[] = multipleColumn.map(item => (`column${item.columnPosition}`));

                // Stack the data from the multiple element columns. This will create a new table with 2 columns for elements and values
                // Note. Nulls are included because they represent a missing value which a user may have allowed
                sql = sql + `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName} UNPIVOT INCLUDE NULLS ( ${this.VALUE_PROPERTY_NAME} FOR ${this.ELEMENT_ID_PROPERTY_NAME} IN (${colNames.join(', ')}) );`;

                // Change the values of the element column
                for (const element of multipleColumn) {
                    sql = sql + `UPDATE ${tableName} SET ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.databaseId} WHERE ${this.ELEMENT_ID_PROPERTY_NAME} = 'column${element.columnPosition}';`;
                }
            }

            // Ensure there are no null elements
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} SET NOT NULL;`;

            // Convert the element contents to integers
            sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} TYPE INTEGER;`;
        }

        return sql;
    }

    private static buildAlterDateTimeColumnSQL(sourceDef: CreateSourceSpecificationDto, importDef: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string = '';
        let expectedDatetimeFormat: string;
        const datetimeDefinition: DateTimeDefinition = importDef.datetimeDefinition;
        if (datetimeDefinition.dateTimeInSingleColumn !== undefined) {
            const dateTimeDef = datetimeDefinition.dateTimeInSingleColumn;
            // Rename the date time column
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.columnPosition} TO ${this.DATE_TIME_PROPERTY_NAME};`;

            expectedDatetimeFormat = dateTimeDef.datetimeFormat;

        } else if (datetimeDefinition.dateTimeInTwoColumns !== undefined) {
            const dateTimeDef = datetimeDefinition.dateTimeInTwoColumns;
            // Rename the date and time columns
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.dateColumn.columnPosition} TO date_col;`;
            sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.timeColumn.columnPosition} TO time_col;`;

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
            sql = `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeInMultiDef.yearColumnPosition} TO year_col;`;
            sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeInMultiDef.monthColumnPosition} TO month_col;`;

            // ---------------------------------------------------------------
            // Get the day columns
            // ---------------------------------------------------------------
            const dayColumns: string[] = dateTimeInMultiDef.dayColumnPosition.split('-');
            if (dayColumns.length === 1) {
                const dayColumnPosition: number = parseInt(dayColumns[0], 10);
                sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${dayColumnPosition} TO day_col;`;
                // Zero-pad the day values to ensure they are two digits (e.g., '1' becomes '01').
                sql = sql + `UPDATE ${tableName} SET day_col = lpad(day_col, 2, '0');`;
            } else {
                const startCol: number = parseInt(dayColumns[0], 10);
                const endCol: number = parseInt(dayColumns[1], 10);
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
                sql = sql + `ALTER TABLE ${tableName} RENAME COLUMN column${timeColumn.columnPosition} TO time_col;`;
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
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} TYPE TIMESTAMP USING strptime(${this.DATE_TIME_PROPERTY_NAME}, '%Y-%m-%d %H:%M:%S');`;


        // If date times are not in UTC then convert them to utc
        if (sourceDef.utcOffset > 0) {
            // Subtract the offset to get UTC time. Local time is ahead of UTC, so to move "back" to UTC
            sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} - INTERVAL ${sourceDef.utcOffset} HOUR;`;
        } else if (sourceDef.utcOffset < 0) {
            // Add the offset to get UTC time. Local time is behind UTC, so to move "forward" to UTC
            sql = sql + `UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} + INTERVAL ${Math.abs(sourceDef.utcOffset)} HOUR;`;
        }

        return sql;
    }

    private static buildAlterValueColumnSQL(sourceDef: CreateSourceSpecificationDto, importDef: ImportSourceDto, tabularDef: ImportSourceTabularParamsDto, tableName: string): string {
        let sql: string = '';

        if (tabularDef.valueDefinition !== undefined) {
            const valueDefinition: ValueDefinition = tabularDef.valueDefinition;
            //--------------------------
            // Value column
            sql = sql + `ALTER TABLE ${tableName} RENAME column${valueDefinition.valueColumnPosition} TO ${this.VALUE_PROPERTY_NAME};`;
            //--------------------------

            //--------------------------
            // Flag column
            if (valueDefinition.flagDefinition !== undefined) {
                const flagDefinition = valueDefinition.flagDefinition;
                sql = sql + `ALTER TABLE ${tableName} RENAME column${flagDefinition.flagColumnPosition} TO ${this.FLAG_PROPERTY_NAME};`;

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
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE_PROPERTY_NAME} TYPE DOUBLE;`;

        return sql;
    }

    private static buildRemoveDuplicatesSQL(tableName: string): string {
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
