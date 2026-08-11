import { ImportSourceTabularParamsDto, DateTimeDefinition, DatePart, DayColumns, TimePart, ValueDefinition, FlagDefinition } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { ViewFlagDto } from 'src/metadata/flags/dtos/view-flag.dto';
import { ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { ImportErrorUtils } from 'src/shared/utils/import-error.utils';
import { StringUtils } from 'src/shared/utils/string.utils';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/create-view-element.dto';
import { DuckDBConnection } from '@duckdb/node-api';
import { ViewSourceSpecificationModel } from 'src/metadata/source-specifications/dtos/view-source-specification.model';
import { FileProcessingError } from 'src/metadata/file-processing-error.model';

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
    static readonly FLAG_PROPERTY_NAME: string = 'flag_id';
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
        sourceDef: ViewSourceSpecificationModel,
        elements: CreateViewElementDto[],
        flags: ViewFlagDto[],
        stationId: string | null,
        userId: number | null,
    ): Promise<FileProcessingError | void> {

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
            { name: 'Value & Flag', buildSql: () => TabularImportTransformer.buildAlterValueColumnSQL(sourceDef, importDef, tabularDef, tableName, flags) },
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

                        // Remove duplicates based on the composite primary key (station_id, element_id, level, date_time, interval, source_id)
                        // Keep the last occurrence by using row_number() ordered by rowid in descending order
                        // DuckDB automatically assigns a rowid to each row, with later rows having higher rowids
                        `DELETE FROM ${tableName} WHERE rowid IN ( 
                            SELECT rowid FROM ( 
                                SELECT rowid, ROW_NUMBER() OVER ( 
                                    PARTITION BY ${this.STATION_ID_PROPERTY_NAME}, ${this.ELEMENT_ID_PROPERTY_NAME}, ${this.LEVEL_PROPERTY_NAME}, ${this.DATE_TIME_PROPERTY_NAME}, ${this.INTERVAL_PROPERTY_NAME}, ${this.SOURCE_ID_PROPERTY_NAME}
                                    ORDER BY rowid DESC 
                                ) as rn FROM ${tableName} 
                            ) WHERE rn > 1 
                        )`,

                        // Select only the final columns we need, discarding unmapped CSV columns 
                        `CREATE OR REPLACE TABLE ${tableName} AS SELECT ${TabularImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName}`,
                    ];
                }
            },
        ];

        for (const step of steps) {
            try {
                // Build the SQL — this can throw if the config is invalid (e.g. missing required fields)
                const sqls: string[] = step.buildSql();
                if (sqls.length > 0) {
                    await conn.run(sqls.join(';\n') + ';');
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

    private static buildAlterStationColumnSQL(source: ImportSourceTabularParamsDto, tableName: string, stationId: string | null): string[] {
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
        const def = source.intervalDefinition;
        if (def.inColumn) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${def.inColumn.columnPosition} TO ${this.INTERVAL_PROPERTY_NAME}`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.INTERVAL_PROPERTY_NAME} SET NOT NULL`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.INTERVAL_PROPERTY_NAME} TYPE INTEGER`);
        } else if (def.default) {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.INTERVAL_PROPERTY_NAME} INTEGER DEFAULT ${def.default.value}`);
        } else {
            throw new Error('Interval definition must specify either inColumn or default');
        }
        return sql;
    }

    private static buildAlterLevelColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string[] {
        const sql: string[] = [];
        const def = source.levelDefinition;
        if (def.inColumn) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${def.inColumn.columnPosition} TO ${this.LEVEL_PROPERTY_NAME}`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.LEVEL_PROPERTY_NAME} SET NOT NULL`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.LEVEL_PROPERTY_NAME} TYPE INTEGER`);
        } else if (def.default) {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.LEVEL_PROPERTY_NAME} INTEGER DEFAULT ${def.default.value}`);
        } else {
            throw new Error('Level definition must specify either inColumn or default');
        }
        return sql;
    }

    static buildAlterCommentColumnSQL(source: ImportSourceTabularParamsDto, tableName: string): string[] {
        if (source.commentDefinition) {
            return [`ALTER TABLE ${tableName} RENAME column${source.commentDefinition.columnPosition} TO ${this.COMMENT_PROPERTY_NAME}`];
        }
        return [`ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT_PROPERTY_NAME} VARCHAR DEFAULT NULL`];
    }

    private static buildAlterElementColumnSQL(tabularDef: ImportSourceTabularParamsDto, tableName: string): string[] {
        const sql: string[] = [];
        const elementDef = tabularDef.elementDefinition;

        if (elementDef.noElement) {
            // Add the element id column with the default element. No SET NOT NULL / TYPE INTEGER
            // here because the default literal is already an integer and applies to every row.
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} VARCHAR DEFAULT ${elementDef.noElement.databaseId}`);

        } else if (elementDef.singleColumn) {
            const singleColumn = elementDef.singleColumn;
            sql.push(`ALTER TABLE ${tableName} RENAME column${singleColumn.columnPosition} TO ${this.ELEMENT_ID_PROPERTY_NAME}`);
            if (singleColumn.elementsToFetch) {
                sql.push(...DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.ELEMENT_ID_PROPERTY_NAME, singleColumn.elementsToFetch, true));
                // As of 09/07/2026 DuckDB ALTER COLUMN fails if values of conflicting types have occurred in the table at any point, even if they have been deleted
                // as a workaround they the create or replace table statement has to be executed to remove the history of conflicting types before altering the column type.
                sql.push(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName}`);
            }

            // Ensure there are no null elements and the column is integer typed.
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} SET NOT NULL`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} TYPE INTEGER`);

        } else if (elementDef.multipleColumns) {
            const columnsMapping = elementDef.multipleColumns.columnsMapping;
            const colNames: string[] = columnsMapping.map(item => `column${item.columnPosition}`);

            // Wide UNPIVOT — the cell value becomes the `value` column and the source column name
            // (e.g. 'column5') becomes the element id placeholder. Nulls are included because
            // they represent a missing value which a user may have allowed.
            sql.push(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName} UNPIVOT INCLUDE NULLS ( ${this.VALUE_PROPERTY_NAME} FOR ${this.ELEMENT_ID_PROPERTY_NAME} IN (${colNames.join(', ')}) )`);

            // Replace the column-name placeholder with the configured database element id.
            for (const element of columnsMapping) {
                sql.push(`UPDATE ${tableName} SET ${this.ELEMENT_ID_PROPERTY_NAME} = ${element.databaseId} WHERE ${this.ELEMENT_ID_PROPERTY_NAME} = 'column${element.columnPosition}'`);
            }

            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} SET NOT NULL`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEMENT_ID_PROPERTY_NAME} TYPE INTEGER`);

        } else {
            throw new Error('Element definition must specify exactly one of noElement, singleColumn, or multipleColumns');
        }

        return sql;
    }

    private static buildAlterDateTimeColumnSQL(sourceDef: ViewSourceSpecificationModel, importDef: ImportSourceTabularParamsDto, tableName: string): string[] {
        const sql: string[] = [];
        let expectedDatetimeFormat: string;
        const datetimeDefinition: DateTimeDefinition = importDef.datetimeDefinition;

        if (datetimeDefinition.combinedColumn !== undefined) {
            const def = datetimeDefinition.combinedColumn;
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${def.columnPosition} TO ${this.DATE_TIME_PROPERTY_NAME}`);
            expectedDatetimeFormat = def.datetimeFormat;

        } else if (datetimeDefinition.separated !== undefined) {
            const { date, time } = datetimeDefinition.separated;

            const datePartHasWidePivot = !!date.yearMonthDayColumns?.dayColumns.columnsRange;
            const timePartHasWidePivot = !!time.hourColumnsRange;
            if (datePartHasWidePivot && timePartHasWidePivot) {
                throw new Error('At most one of day columns range and hour columns range can be used (only one wide pivot per file is supported)');
            }

            // Build the date side; populate `date_col` with the file format kept in `dateFormatStr`.
            const dateFormatStr = this.buildDatePartSQL(sql, tableName, date);

            // Build the time side; populate `time_col` with the file format kept in `timeFormatStr`.
            const timeFormatStr = this.buildTimePartSQL(sql, tableName, time);

            sql.push(`ALTER TABLE ${tableName} ADD COLUMN combined_date_time_col VARCHAR`);
            sql.push(`UPDATE ${tableName} SET combined_date_time_col = date_col || ' ' || time_col`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN combined_date_time_col TO ${this.DATE_TIME_PROPERTY_NAME}`);
            expectedDatetimeFormat = `${dateFormatStr} ${timeFormatStr}`;

        } else {
            throw new Error("Date time interpretation not valid");
        }

        // Convert all values to a valid sql timestamp using the format specified
        // Note, some files can be messy and can hang duckdb when `strptime` is used directly. So always use `try_strptime` to sanitise the file first
        sql.push(`UPDATE ${tableName} SET ${this.DATE_TIME_PROPERTY_NAME} = try_strptime(${this.DATE_TIME_PROPERTY_NAME}, '${expectedDatetimeFormat}')`);
        sql.push(`DELETE FROM ${tableName} WHERE ${this.DATE_TIME_PROPERTY_NAME} IS NULL`);
        sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.DATE_TIME_PROPERTY_NAME} SET NOT NULL`);

        // As of 09/07/2026 DuckDB ALTER COLUMN fails if values of conflicting types have occurred in the table at any point, even if they have been deleted
        // as a workaround they the create or replace table statement has to be executed to remove the history of conflicting types before altering the column type.
        sql.push(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName}`);
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

    /**
     * Materializes a `date_col` column on the staging table from a `DatePart`
     * spec and returns the strftime format that `date_col` is now in.
     */
    private static buildDatePartSQL(sql: string[], tableName: string, date: DatePart): string {
        if (date.singleColumn) {
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${date.singleColumn.columnPosition} TO date_col`);
            return date.singleColumn.dateFormat;
        }
        if (date.yearMonthDayColumns) {
            const { yearColumnPosition, monthColumnPosition, dayColumns } = date.yearMonthDayColumns;
            sql.push(...this.buildYearMonthDaySQL(tableName, yearColumnPosition, monthColumnPosition, dayColumns));
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN date_col VARCHAR`);
            // month_col is zero-padded here; day_col is already padded inside buildYearMonthDaySQL.
            sql.push(`UPDATE ${tableName} SET date_col = year_col || '-' || lpad(month_col, 2, '0') || '-' || day_col`);
            return '%Y-%m-%d';
        }
        throw new Error('Date part must define either singleColumn or yearMonthDayColumns');
    }

    /**
     * Materializes a `time_col` column on the staging table from a `TimePart`
     * spec and returns the strftime format that `time_col` is now in.
     */
    private static buildTimePartSQL(sql: string[], tableName: string, time: TimePart): string {
        if (time.defaultHour) {
            const strHour = StringUtils.addLeadingZero(time.defaultHour.hour);
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN time_col VARCHAR DEFAULT '${strHour}:00:00'`);
            return '%H:%M:%S';
        }
        if (time.singleColumn) {
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${time.singleColumn.columnPosition} TO time_col`);
            return time.singleColumn.timeFormat;
        }
        if (time.hourAndMinuteColumns) {
            const { hourColumnPosition, minuteColumnPosition } = time.hourAndMinuteColumns;
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${hourColumnPosition} TO hour_col`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${minuteColumnPosition} TO minute_col`);
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN time_col VARCHAR`);
            sql.push(`UPDATE ${tableName} SET time_col = lpad(hour_col, 2, '0') || ':' || lpad(minute_col, 2, '0') || ':00'`);
            return '%H:%M:%S';
        }
        if (time.hourColumnsRange) {
            const { firstColumnPosition, lastColumnPosition } = time.hourColumnsRange;
            const hourColumnNames: string[] = [];
            for (let i = firstColumnPosition; i <= lastColumnPosition; i++) {
                hourColumnNames.push(`column${i}`);
            }
            // Wide UNPIVOT — the cell value becomes the `value` column, and the
            // source column name (e.g. 'column5') becomes `hour_col`. Nulls
            // excluded so missing hours don't generate ghost observations.
            sql.push(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName} UNPIVOT (${this.VALUE_PROPERTY_NAME} FOR hour_col IN (${hourColumnNames.join(', ')}))`);
            // Map back to hour-of-day (00..23). Hours start at 0, unlike days at 1,
            // so the offset is `- firstColumnPosition` not `- firstColumnPosition + 1`.
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN time_col VARCHAR`);
            sql.push(`UPDATE ${tableName} SET time_col = lpad((substr(hour_col, 7)::INTEGER - ${firstColumnPosition})::VARCHAR, 2, '0') || ':00:00'`);
            return '%H:%M:%S';
        }
        throw new Error('Time part must define defaultHour, singleColumn, hourAndMinuteColumns, or hourColumnsRange');
    }

    private static buildAlterValueColumnSQL(sourceDef: ViewSourceSpecificationModel, importDef: ImportSourceDto, tabularDef: ImportSourceTabularParamsDto, tableName: string, flags: ViewFlagDto[]): string[] {
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
                    // flagsToFetch databaseId is already a flag table id (integer), use directly
                    sql.push(...DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.FLAG_PROPERTY_NAME, flagDefinition.flagsToFetch, false));
                } else {
                    // No explicit mapping — map string abbreviations to integer IDs using a CASE statement
                    const caseParts = flags.map(f => `WHEN UPPER(${this.FLAG_PROPERTY_NAME}) = '${f.abbreviation.toUpperCase()}' THEN ${f.id}`);
                    if (caseParts.length > 0) {
                        sql.push(`UPDATE ${tableName} SET ${this.FLAG_PROPERTY_NAME} = CASE ${caseParts.join(' ')} ELSE NULL END WHERE ${this.FLAG_PROPERTY_NAME} IS NOT NULL`);
                    }
                }

            } else {
                sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} INTEGER DEFAULT NULL`);
            }
            //--------------------------

        } else {
            // Just add the flag column because the value column should have been added when stacking elements of date columns
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.FLAG_PROPERTY_NAME} INTEGER DEFAULT NULL`);
        }

        // Get all missing value indicators in quoted format
        const missingValueIndicators: string[] = importDef.sourceMissingValueIndicators.split(',').map(f => `'${f}'`).filter(f => f);

        let missingValueCondition: string = `${this.VALUE_PROPERTY_NAME} IS NULL`;
        if (missingValueIndicators.length > 0) {
            missingValueCondition = `${missingValueCondition} OR ${this.VALUE_PROPERTY_NAME} IN (${missingValueIndicators.join(',')})`;
        }

        if (sourceDef.allowMissingValue) {
            // Set missing flag if missing are allowed to be imported.
            const missingFlag = flags.find(f => f.name.toLowerCase() === 'missing');
            const missingFlagId = missingFlag ? missingFlag.id : 'NULL';
            sql.push(`UPDATE ${tableName} SET ${this.VALUE_PROPERTY_NAME} = NULL, ${this.FLAG_PROPERTY_NAME} = ${missingFlagId} WHERE ${missingValueCondition}`);
        } else {
            // Delete all missing values if not allowed.
            sql.push(`DELETE FROM ${tableName} WHERE ${missingValueCondition}`);
        }

        // As of 09/07/2026 DuckDB ALTER COLUMN fails if values of conflicting types have occurred in the table at any point, even if they have been deleted
        // as a workaround they the create or replace table statement has to be executed to remove the history of conflicting types before altering the column type.
        sql.push(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName}`);

        // Convert the flag column to integer
        sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.FLAG_PROPERTY_NAME} TYPE INTEGER`);

        // Convert the value column to double.
        // Note, important to use DOUBLE to align the precision between DuckDB and Node.js (64-bit double-precision floating-point format (IEEE 754))
        sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.VALUE_PROPERTY_NAME} TYPE DOUBLE`);

        return sql;
    }

    private static buildYearMonthDaySQL(tableName: string, yearColPos: number, monthColPos: number, dayColumns: DayColumns): string[] {
        const sql: string[] = [];
        sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${yearColPos} TO year_col`);
        sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${monthColPos} TO month_col`);

        if (dayColumns.singleColumn) {
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${dayColumns.singleColumn.columnPosition} TO day_col`);
            // Zero-pad the day values to ensure they are two digits (e.g., '1' becomes '01').
            sql.push(`UPDATE ${tableName} SET day_col = lpad(day_col, 2, '0')`);
        } else if (dayColumns.columnsRange) {
            const { firstColumnPosition, lastColumnPosition } = dayColumns.columnsRange;
            const dayColumnNames: string[] = [];
            for (let i = firstColumnPosition; i <= lastColumnPosition; i++) {
                dayColumnNames.push(`column${i}`);
            }
            // Unpivot the day columns to create 'day_col' and a new 'value' column.
            // Nulls are excluded because they represent non-existent days (e.g. Feb 31st).
            sql.push(`CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM ${tableName} UNPIVOT (${this.VALUE_PROPERTY_NAME} FOR day_col IN (${dayColumnNames.join(', ')}))`);
            // Extract the numeric day part from the column name (e.g. 'column5' -> 5) and zero-pad it.
            sql.push(`UPDATE ${tableName} SET day_col = lpad((substr(day_col, 7)::INTEGER - ${firstColumnPosition} + 1)::VARCHAR, 2, '0')`);
        } else {
            throw new Error('Day columns must define either singleColumn or columnsRange');
        }
        return sql;
    }


}
