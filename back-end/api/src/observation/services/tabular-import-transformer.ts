import { FlagEnum } from '../enums/flag.enum';
import { ImportSourceTabularParamsDto, DateTimeDefinition, ValueDefinition, FlagDefinition } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { ImportErrorUtils } from 'src/shared/utils/import-error.utils';
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

    // Column names matching ObservationEntity @Column({ name }) values.
    static readonly STATION_ID_PROPERTY_NAME: string = 'station_id';
    static readonly ELEMENT_ID_PROPERTY_NAME: string = 'element_id';
    static readonly LEVEL_PROPERTY_NAME: string = 'level';
    static readonly DATE_TIME_PROPERTY_NAME: string = 'date_time';
    static readonly INTERVAL_PROPERTY_NAME: string = 'interval';
    static readonly SOURCE_ID_PROPERTY_NAME: string = 'source_id';
    static readonly VALUE_PROPERTY_NAME: string = 'value';
    static readonly FLAG_PROPERTY_NAME: string = 'flag';
    static readonly COMMENT_PROPERTY_NAME: string = 'comment';
    // Note: entry_user_id comes from AppBaseEntity, the base class of ObservationEntity.
    static readonly ENTRY_USER_ID_PROPERTY_NAME: string = 'entry_user_id';

    /** All final column names in order for SELECT and COPY. */
    static readonly ALL_COLUMNS: string[] = [
        TabularImportTransformer.STATION_ID_PROPERTY_NAME,
        TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME,
        TabularImportTransformer.LEVEL_PROPERTY_NAME,
        TabularImportTransformer.DATE_TIME_PROPERTY_NAME,
        TabularImportTransformer.INTERVAL_PROPERTY_NAME,
        TabularImportTransformer.SOURCE_ID_PROPERTY_NAME,
        TabularImportTransformer.VALUE_PROPERTY_NAME,
        TabularImportTransformer.FLAG_PROPERTY_NAME,
        TabularImportTransformer.COMMENT_PROPERTY_NAME,
        TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME,
    ];

    public static async executeTransformation(
        conn: DuckDBConnection,
        tableName: string,
        sourceId: number,
        sourceDef: CreateSourceSpecificationDto,
        elements: CreateViewElementDto[],
        stationId?: string,
        userId?: number,
    ): Promise<PreviewError | void> {

        const importDef = sourceDef.parameters as ImportSourceDto;
        const tabularDef = importDef.dataStructureParameters as ImportSourceTabularParamsDto;

        // Execute each transformation step individually.
        // Each step's SQL is built and executed separately so that:
        // 1. If a step fails, previous successful transformations remain visible in the preview
        // 2. The error message tells the user exactly which step failed
        // 3. The user can see partial progress and fix only what's broken

        const steps: { name: string; buildSql: () => string[] }[] = [
            { name: 'Station', buildSql: () => TabularImportTransformer.buildAlterStationColumnSQL(tabularDef, tableName, stationId) },
            { name: 'Element', buildSql: () => TabularImportTransformer.buildAlterElementColumnSQL(tabularDef, tableName) },
            { name: 'Level', buildSql: () => TabularImportTransformer.buildAlterLevelColumnSQL(tabularDef, tableName) },
            { name: 'Date/Time', buildSql: () => TabularImportTransformer.buildAlterDateTimeColumnSQL(sourceDef, tabularDef, tableName) },
            { name: 'Interval', buildSql: () => TabularImportTransformer.buildAlterIntervalColumnSQL(tabularDef, tableName) },
            { name: 'Value & Flag', buildSql: () => TabularImportTransformer.buildAlterValueColumnSQL(sourceDef, importDef, tabularDef, tableName) },
            {
                name: 'Scale Values',
                buildSql: () => {
                    if (sourceDef.scaleValues) {
                        return TabularImportTransformer.buildScaleValueSQL(tableName, elements);
                    }
                    return [];
                }
            },
            { name: 'Comment', buildSql: () => TabularImportTransformer.buildAlterCommentColumnSQL(tabularDef, tableName) },
            {
                name: 'Finalize',
                buildSql: () => {
                    return [
                        `ALTER TABLE ${tableName} ADD COLUMN ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME} INTEGER DEFAULT ${sourceId || 'NULL'}`,
                        `ALTER TABLE ${tableName} ADD COLUMN ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME} INTEGER DEFAULT ${userId || 'NULL'}`,
                        TabularImportTransformer.buildRemoveDuplicatesSQL(tableName),
                        // Select only the final columns we need, discarding unmapped CSV columns 
                        `CREATE OR REPLACE TABLE ${tableName} AS SELECT ${TabularImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName}`,
                    ];
                }
            },
        ];

        for (const step of steps) {
            try {
                // Build the SQL — this can throw if the config is invalid (e.g. missing required fields)
                const sqls = step.buildSql();
                if (sqls.length > 0) {
                    await conn.run(sqls.join('; '));
                }
            } catch (error) {
                // Stop processing — later steps may depend on this one.
                return ImportErrorUtils.classifyDuckDbError(error, step.name);

            }
        }
    }

    public static async exportTransformedDataToFile(conn: DuckDBConnection, tableName: string, exportFilePath: string): Promise<void> {
        await conn.run(`COPY ( SELECT ${TabularImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName} ) TO '${exportFilePath}' (HEADER, DELIMITER ',');`);
    }

    private static buildScaleValueSQL(tableName: string, elements: CreateViewElementDto[]): string[] {
        const sql: string[] = [];
        for (const element of elements) {
            if (element.entryScaleFactor) {
                sql.push(`UPDATE ${tableName} SET ${TabularImportTransformer.VALUE_PROPERTY_NAME} = (${TabularImportTransformer.VALUE_PROPERTY_NAME} / ${element.entryScaleFactor}) WHERE ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME} = ${element.id} AND ${TabularImportTransformer.VALUE_PROPERTY_NAME} IS NOT NULL`);
            }
        }
        return sql;
    }


    private static buildAlterStationColumnSQL(source: ImportSourceTabularParamsDto, tableName: string, stationId?: string): string[] {
        const sql: string[] = [];
        if (source.stationDefinition) {
            const stationDefinition = source.stationDefinition;
            // Set the station column name
            sql.push(`ALTER TABLE ${tableName} RENAME column${stationDefinition.columnPosition} TO ${this.STATION_ID_PROPERTY_NAME}`);

            if (stationDefinition.stationsToFetch) {
                sql.push(...DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.STATION_ID_PROPERTY_NAME, stationDefinition.stationsToFetch, true));
            }

            // Ensure there are no nulls in the station column
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.STATION_ID_PROPERTY_NAME} SET NOT NULL`);

        } else if (stationId) {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.STATION_ID_PROPERTY_NAME} VARCHAR DEFAULT '${stationId}'`);
        } else {
            throw new Error("Station must be provided");
        }

        return sql;
    }

    private static buildAlterIntervalColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string[] {
        const sql: string[] = [];
        if (source.intervalDefinition.columnPosition !== undefined) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${source.intervalDefinition.columnPosition} TO ${this.INTERVAL_PROPERTY_NAME}`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.INTERVAL_PROPERTY_NAME} SET NOT NULL`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.INTERVAL_PROPERTY_NAME} TYPE INTEGER`);
        } else {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.INTERVAL_PROPERTY_NAME} INTEGER DEFAULT ${source.intervalDefinition.defaultValue}`);
        }
        return sql;
    }

    private static buildAlterLevelColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string[] {
        const sql: string[] = [];
        if (source.levelDefinition.columnPosition !== undefined) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${source.levelDefinition.columnPosition} TO ${this.LEVEL_PROPERTY_NAME}`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.LEVEL_PROPERTY_NAME} SET NOT NULL`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.LEVEL_PROPERTY_NAME} TYPE INTEGER`);
        } else {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.LEVEL_PROPERTY_NAME} INTEGER DEFAULT ${source.levelDefinition.defaultValue}`);
        }
        return sql;
    }

    static buildAlterCommentColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string[] {
        if (source.commentColumnPosition !== undefined) {
            return [`ALTER TABLE ${tableName} RENAME column${source.commentColumnPosition} TO ${this.COMMENT_PROPERTY_NAME}`];
        }
        return [`ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT_PROPERTY_NAME} VARCHAR DEFAULT NULL`];
    }

    private static buildAlterElementColumnSQL(tabularDef: ImportSourceTabularParamsDto, tableName: string): string[] {
        const sql: string[] = [];
        if (tabularDef.elementDefinition.noElement) {
            const noElement = tabularDef.elementDefinition.noElement;

            // Add the element id column with the default element
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} VARCHAR DEFAULT ${noElement.databaseId}`);

        } else if (tabularDef.elementDefinition.hasElement) {
            const hasElement = tabularDef.elementDefinition.hasElement;
            if (hasElement.singleColumn) {
                const singleColumn = hasElement.singleColumn;
                //--------------------------
                // Element column
                sql.push(`ALTER TABLE ${tableName} RENAME column${singleColumn.elementColumnPosition} TO ${this.ELEMENT_ID_PROPERTY_NAME}`);
                if (singleColumn.elementsToFetch) {
                    sql.push(...DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.ELEMENT_ID_PROPERTY_NAME, singleColumn.elementsToFetch, true));
                }
                //--------------------------
            } else if (hasElement.multipleColumn) {
                const multipleColumn = hasElement.multipleColumn;
                const colNames: string[] = multipleColumn.map(item => (`column${item.columnPosition}`));

                // Stack the data from the multiple element columns. This will create a new table with 2 columns for elements and values
                // Note. Nulls are included because they represent a missing value which a user may have allowed
                sql.push(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName} UNPIVOT INCLUDE NULLS ( ${this.VALUE_PROPERTY_NAME} FOR ${this.ELEMENT_ID_PROPERTY_NAME} IN (${colNames.join(', ')}) )`);

                // Change the values of the element column
                for (const element of multipleColumn) {
                    sql.push(`UPDATE ${tableName} SET ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.databaseId} WHERE ${this.ELEMENT_ID_PROPERTY_NAME} = 'column${element.columnPosition}'`);
                }
            }

            // Ensure there are no null elements
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} SET NOT NULL`);

            // Convert the element contents to integers
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} TYPE INTEGER`);
        }

        return sql;
    }

    private static buildAlterDateTimeColumnSQL(sourceDef: CreateSourceSpecificationDto, importDef: ImportSourceTabularParamsDto, tableName: string): string[] {
        const sql: string[] = [];
        let expectedDatetimeFormat: string;
        const datetimeDefinition: DateTimeDefinition = importDef.datetimeDefinition;

        if (datetimeDefinition.dateTimeInSingleColumn !== undefined) {
            const def = datetimeDefinition.dateTimeInSingleColumn;
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${def.columnPosition} TO ${this.DATE_TIME_PROPERTY_NAME}`);
            expectedDatetimeFormat = def.datetimeFormat;

        } else if (datetimeDefinition.dateInSingleColumn !== undefined) {
            const def = datetimeDefinition.dateInSingleColumn;
            const strHour = StringUtils.addLeadingZero(def.defaultHour);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${def.columnPosition} TO date_col`);
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN time_col VARCHAR DEFAULT '${strHour}:00:00'`);
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN combined_date_time_col VARCHAR`);
            sql.push(`UPDATE ${tableName} SET combined_date_time_col = date_col || ' ' || time_col`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN combined_date_time_col TO ${this.DATE_TIME_PROPERTY_NAME}`);
            expectedDatetimeFormat = `${def.dateFormat} %H:%M:%S`;

        } else if (datetimeDefinition.dateTimeInTwoColumns !== undefined) {
            const def = datetimeDefinition.dateTimeInTwoColumns;
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${def.dateColumnPosition} TO date_col`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${def.timeColumnPosition} TO time_col`);
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN combined_date_time_col VARCHAR`);
            sql.push(`UPDATE ${tableName} SET combined_date_time_col = date_col || ' ' || time_col`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN combined_date_time_col TO ${this.DATE_TIME_PROPERTY_NAME}`);
            expectedDatetimeFormat = `${def.dateFormat} ${def.timeFormat}`;

        } else if (datetimeDefinition.dateTimeInMultipleColumns !== undefined) {
            const def = datetimeDefinition.dateTimeInMultipleColumns;
            sql.push(...this.buildYearMonthDaySQL(tableName, def.yearColumnPosition, def.monthColumnPosition, def.dayColumnPosition));
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${def.timeColumnPosition} TO time_col`);
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN combined_date_time_col VARCHAR`);
            sql.push(`UPDATE ${tableName} SET combined_date_time_col = year_col || '-' || month_col || '-' || day_col || ' ' || time_col`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN combined_date_time_col TO ${this.DATE_TIME_PROPERTY_NAME}`);
            expectedDatetimeFormat = `%Y-%m-%d ${def.timeFormat}`;

        } else if (datetimeDefinition.dateInMultipleColumns !== undefined) {
            const def = datetimeDefinition.dateInMultipleColumns;
            const strHour = StringUtils.addLeadingZero(def.defaultHour);
            sql.push(...this.buildYearMonthDaySQL(tableName, def.yearColumnPosition, def.monthColumnPosition, def.dayColumnPosition));
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN time_col VARCHAR DEFAULT '${strHour}:00:00'`);
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN combined_date_time_col VARCHAR`);
            sql.push(`UPDATE ${tableName} SET combined_date_time_col = year_col || '-' || month_col || '-' || day_col || ' ' || time_col`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN combined_date_time_col TO ${this.DATE_TIME_PROPERTY_NAME}`);
            expectedDatetimeFormat = `%Y-%m-%d %H:%M:%S`;

        } else {
            throw new Error("Date time interpretation not valid");
        }

        // Convert all values to a valid sql timestamp using the format specified
        // Note, some files can be messy and can hang duckdb when `strptime` is used directly. So always use `try_strptime` to sanitise the file first
        sql.push(`UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = try_strptime(${this.DATE_TIME_PROPERTY_NAME}, '${expectedDatetimeFormat}')`);
        sql.push(`DELETE FROM ${tableName} WHERE ${this.DATE_TIME_PROPERTY_NAME} IS NULL`);
        sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} SET NOT NULL`);
        sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} TYPE TIMESTAMP USING strptime(${this.DATE_TIME_PROPERTY_NAME}, '%Y-%m-%d %H:%M:%S')`);

        // If date times are not in UTC then convert them to utc
        if (sourceDef.utcOffset > 0) {
            // Subtract the offset to get UTC time. Local time is ahead of UTC, so to move "back" to UTC
            sql.push(`UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} - INTERVAL ${sourceDef.utcOffset} HOUR`);
        } else if (sourceDef.utcOffset < 0) {
            // Add the offset to get UTC time. Local time is behind UTC, so to move "forward" to UTC
            sql.push(`UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = ${this.DATE_TIME_PROPERTY_NAME} + INTERVAL ${Math.abs(sourceDef.utcOffset)} HOUR`);
        }

        return sql;
    }

    private static buildAlterValueColumnSQL(sourceDef: CreateSourceSpecificationDto, importDef: ImportSourceDto, tabularDef: ImportSourceTabularParamsDto, tableName: string): string[] {
        const sql: string[] = [];

        if (tabularDef.valueDefinition !== undefined) {
            const valueDefinition: ValueDefinition = tabularDef.valueDefinition;
            //--------------------------
            // Value column
            sql.push(`ALTER TABLE ${tableName} RENAME column${valueDefinition.valueColumnPosition} TO ${this.VALUE_PROPERTY_NAME}`);
            //--------------------------

            //--------------------------
            // Flag column
            if (valueDefinition.flagDefinition !== undefined) {
                const flagDefinition: FlagDefinition = valueDefinition.flagDefinition;
                sql.push(`ALTER TABLE ${tableName} RENAME column${flagDefinition.flagColumnPosition} TO ${this.FLAG_PROPERTY_NAME}`);

                if (flagDefinition.flagsToFetch) {
                    sql.push(...DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.FLAG_PROPERTY_NAME, flagDefinition.flagsToFetch, false));
                }

            } else {
                sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL`);
            }
            //--------------------------

        } else {
            // Just add the flag column because the value column should have been added when stacking elements of date columns
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} VARCHAR DEFAULT NULL`);
        }

        // Get all missing value indicators in quoted format
        const missingValueIndicators: string[] = importDef.sourceMissingValueIndicators.split(',').map(f => `'${f}'`).filter(f => f);

        let missingValueCondition: string = `${this.VALUE_PROPERTY_NAME} IS NULL`;
        if (missingValueIndicators.length > 0) {
            missingValueCondition = `${missingValueCondition} OR ${this.VALUE_PROPERTY_NAME} IN (${missingValueIndicators.join(',')})`;
        }

        if (sourceDef.allowMissingValue) {
            // Set missing flag if missing are allowed to be imported.
            sql.push(`UPDATE ${tableName} SET ${this.VALUE_PROPERTY_NAME} = NULL, ${this.FLAG_PROPERTY_NAME} = '${FlagEnum.MISSING}' WHERE ${missingValueCondition}`);
        } else {
            // Delete all missing values if not allowed.
            sql.push(`DELETE FROM ${tableName} WHERE ${missingValueCondition}`);
        }

        // Convert the value column to double.
        // Note, important to use DOUBLE to align the precision between DuckDB and Node.js (64-bit double-precision floating-point format (IEEE 754))
        sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE_PROPERTY_NAME} TYPE DOUBLE`);

        return sql;
    }

    private static buildYearMonthDaySQL(tableName: string, yearColPos: number, monthColPos: number, dayColPos: string): string[] {
        const sql: string[] = [];
        sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${yearColPos} TO year_col`);
        sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${monthColPos} TO month_col`);

        const dayColumns = dayColPos.split('-');
        if (dayColumns.length === 1) {
            const dayColumnPosition = parseInt(dayColumns[0], 10);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${dayColumnPosition} TO day_col`);
            // Zero-pad the day values to ensure they are two digits (e.g., '1' becomes '01').
            sql.push(`UPDATE ${tableName} SET day_col = lpad(day_col, 2, '0')`);
        } else {
            const startCol = parseInt(dayColumns[0], 10);
            const endCol = parseInt(dayColumns[1], 10);
            const dayColumnNames: string[] = [];
            for (let i = startCol; i <= endCol; i++) {
                dayColumnNames.push(`column${i}`);
            }
            // Unpivot the day columns to create 'day_col' and a new 'value' column.
            // Nulls are excluded because they represent non-existent days (e.g. Feb 31st).
            sql.push(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName} UNPIVOT (${this.VALUE_PROPERTY_NAME} FOR day_col IN (${dayColumnNames.join(', ')}))`);
            // Extract the numeric day part from the column name (e.g. 'column5' -> 5) and zero-pad it.
            sql.push(`UPDATE ${tableName} SET day_col = lpad(substr(day_col, 7)::INTEGER - ${startCol} + 1, 2, '0')`);
        }
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
