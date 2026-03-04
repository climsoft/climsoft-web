import { DuckDBConnection } from '@duckdb/node-api';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { StationColumnMappingDto } from 'src/metadata/dtos/metadata-import-preview.dto';
import { DateTimeDefinition, HourDefinition } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { StringUtils } from 'src/shared/utils/string.utils';
import { PreviewError } from 'src/observation/dtos/import-preview.dto';
import { ImportErrorUtils } from 'src/shared/utils/import-error.utils';
/**
 * Static utility class that builds DuckDB SQL statements for transforming
 * imported CSV data into the stations table schema.
 */
export class StationImportTransformer {

    // Column names matching StationEntity @Column({ name }) values.
    // Note: latitude/longitude don't map directly to entity columns (entity uses a single `location` Point column).
    // They are kept as separate columns here and will need special handling at the PostgreSQL import stage.
    static readonly ID_PROPERTY: string = 'id';
    static readonly NAME_PROPERTY: string = 'name';
    static readonly DESCRIPTION_PROPERTY: string = 'description';
    static readonly LATITUDE_PROPERTY: string = 'latitude';
    static readonly LONGITUDE_PROPERTY: string = 'longitude';
    static readonly ELEVATION_PROPERTY: string = 'elevation';
    static readonly OBS_PROC_METHOD_PROPERTY: string = 'observation_processing_method';
    static readonly OBS_ENVIRONMENT_ID_PROPERTY: string = 'observation_environment_id';
    static readonly OBS_FOCUS_ID_PROPERTY: string = 'observation_focus_id';
    static readonly OWNER_ID_PROPERTY: string = 'owner_id';
    static readonly OPERATOR_ID_PROPERTY: string = 'operator_id';
    static readonly WMO_ID_PROPERTY: string = 'wmo_id';
    static readonly WIGOS_ID_PROPERTY: string = 'wigos_id';
    static readonly ICAO_ID_PROPERTY: string = 'icao_id';
    static readonly STATUS_PROPERTY: string = 'status';
    static readonly DATE_ESTABLISHED_PROPERTY: string = 'date_established';
    static readonly DATE_CLOSED_PROPERTY: string = 'date_closed';
    static readonly COMMENT_PROPERTY: string = 'comment';
    // From AppBaseEntity
    static readonly ENTRY_USER_ID_PROPERTY: string = 'entry_user_id';

    /** All final column names in order for SELECT and COPY. */
    static readonly ALL_COLUMNS: string[] = [
        StationImportTransformer.ID_PROPERTY,
        StationImportTransformer.NAME_PROPERTY,
        StationImportTransformer.DESCRIPTION_PROPERTY,
        StationImportTransformer.OBS_PROC_METHOD_PROPERTY,
        StationImportTransformer.LATITUDE_PROPERTY,
        StationImportTransformer.LONGITUDE_PROPERTY,
        StationImportTransformer.ELEVATION_PROPERTY,
        StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY,
        StationImportTransformer.OBS_FOCUS_ID_PROPERTY,
        StationImportTransformer.OWNER_ID_PROPERTY,
        StationImportTransformer.OPERATOR_ID_PROPERTY,
        StationImportTransformer.WMO_ID_PROPERTY,
        StationImportTransformer.WIGOS_ID_PROPERTY,
        StationImportTransformer.ICAO_ID_PROPERTY,
        StationImportTransformer.STATUS_PROPERTY,
        StationImportTransformer.DATE_ESTABLISHED_PROPERTY,
        StationImportTransformer.DATE_CLOSED_PROPERTY,
        StationImportTransformer.COMMENT_PROPERTY,
        StationImportTransformer.ENTRY_USER_ID_PROPERTY,
    ];

    public static async executeTransformation(
        conn: DuckDBConnection,
        tableName: string,
        mapping: StationColumnMappingDto,
        userId?: number,
    ): Promise<PreviewError | void> {

        const steps: { name: string; buildSql: () => string[] }[] = [
            { name: 'Id', buildSql: () => StationImportTransformer.buildAlterIdColumnSQL(tableName, mapping) },
            { name: 'Name', buildSql: () => StationImportTransformer.buildAlterNameColumnSQL(tableName, mapping) },
            { name: 'Description', buildSql: () => StationImportTransformer.buildAlterDescriptionColumnSQL(tableName, mapping) },
            { name: 'Obs Processing Method', buildSql: () => StationImportTransformer.buildAlterFieldMappingColumnSQL(tableName, StationImportTransformer.OBS_PROC_METHOD_PROPERTY, mapping.obsProcMethod) },
            { name: 'Latitude/Longitude/Elevation', buildSql: () => StationImportTransformer.buildAlterLatLongElevationColumnSQL(tableName, mapping) },
            { name: 'Obs Environment', buildSql: () => StationImportTransformer.buildAlterFieldMappingColumnSQL(tableName, StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY, mapping.obsEnvironment) },
            { name: 'Obs Focus', buildSql: () => StationImportTransformer.buildAlterFieldMappingColumnSQL(tableName, StationImportTransformer.OBS_FOCUS_ID_PROPERTY, mapping.obsFocus) },
            { name: 'Owner', buildSql: () => StationImportTransformer.buildAlterFieldMappingColumnSQL(tableName, StationImportTransformer.OWNER_ID_PROPERTY, mapping.owner) },
            { name: 'Operator', buildSql: () => StationImportTransformer.buildAlterFieldMappingColumnSQL(tableName, StationImportTransformer.OPERATOR_ID_PROPERTY, mapping.operator) },
            { name: 'WMO/WIGOS/ICAO IDs', buildSql: () => StationImportTransformer.buildAlterIdColumnsSQL(tableName, mapping) },
            { name: 'Status', buildSql: () => StationImportTransformer.buildAlterFieldMappingColumnSQL(tableName, StationImportTransformer.STATUS_PROPERTY, mapping.status) },
            { name: 'Date Established/Closed', buildSql: () => StationImportTransformer.buildAlterDatesColumnSQL(tableName, mapping) },
            { name: 'Comment', buildSql: () => StationImportTransformer.buildAlterCommentColumnSQL(tableName, mapping) },
            {
                name: 'Finalize',
                buildSql: () => {
                    return [
                        `ALTER TABLE ${tableName} ADD COLUMN ${StationImportTransformer.ENTRY_USER_ID_PROPERTY} INTEGER DEFAULT ${userId || 'NULL'}`,
                        StationImportTransformer.buildRemoveDuplicatesSQL(tableName),
                        // Select only the final columns we need, discarding unmapped CSV columns
                        `CREATE OR REPLACE TABLE ${tableName} AS SELECT ${StationImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName}`,
                    ];
                }
            },
        ];

        for (const step of steps) {
            try {
                const sqls = step.buildSql();
                if (sqls.length > 0) {
                    await conn.run(sqls.join('; '));
                }
            } catch (error) {
                return ImportErrorUtils.classifyDuckDbError(error, step.name);
            }
        }
    }

    public static async exportTransformedDataToFile(conn: DuckDBConnection, tableName: string, exportFilePath: string): Promise<void> {
        await conn.run(`COPY (SELECT ${StationImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName}) TO '${exportFilePath}' (HEADER, DELIMITER ',');`);
    }

    // ─── Step Builders ───────────────────────────────────────

    private static buildAlterIdColumnSQL(tableName: string, mapping: StationColumnMappingDto): string[] {
        return [
            `ALTER TABLE ${tableName} RENAME column${mapping.idColumnPosition} TO ${this.ID_PROPERTY}`,
            `ALTER TABLE ${tableName} ALTER COLUMN ${this.ID_PROPERTY} SET NOT NULL`,
        ];
    }

    private static buildAlterNameColumnSQL(tableName: string, mapping: StationColumnMappingDto): string[] {
        return [
            `ALTER TABLE ${tableName} RENAME column${mapping.nameColumnPosition} TO ${this.NAME_PROPERTY}`,
            `ALTER TABLE ${tableName} ALTER COLUMN ${this.NAME_PROPERTY} SET NOT NULL`,
        ];
    }

    private static buildAlterDescriptionColumnSQL(tableName: string, mapping: StationColumnMappingDto): string[] {
        if (mapping.descriptionColumnPosition !== undefined) {
            return [`ALTER TABLE ${tableName} RENAME column${mapping.descriptionColumnPosition} TO ${this.DESCRIPTION_PROPERTY}`];
        }
        return [`ALTER TABLE ${tableName} ADD COLUMN ${this.DESCRIPTION_PROPERTY} VARCHAR DEFAULT NULL`];
    }

    private static buildAlterLatLongElevationColumnSQL(tableName: string, mapping: StationColumnMappingDto): string[] {
        const sql: string[] = [];

        if (mapping.latitudeColumnPosition !== undefined) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${mapping.latitudeColumnPosition} TO ${this.LATITUDE_PROPERTY}`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.LATITUDE_PROPERTY} TYPE DOUBLE`);
        } else {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.LATITUDE_PROPERTY} DOUBLE DEFAULT NULL`);
        }

        if (mapping.longitudeColumnPosition !== undefined) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${mapping.longitudeColumnPosition} TO ${this.LONGITUDE_PROPERTY}`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.LONGITUDE_PROPERTY} TYPE DOUBLE`);
        } else {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.LONGITUDE_PROPERTY} DOUBLE DEFAULT NULL`);
        }

        if (mapping.elevationColumnPosition !== undefined) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${mapping.elevationColumnPosition} TO ${this.ELEVATION_PROPERTY}`);
            sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEVATION_PROPERTY} TYPE DOUBLE`);
        } else {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.ELEVATION_PROPERTY} DOUBLE DEFAULT NULL`);
        }

        return sql;
    }

    /**
     * Generic builder for fields that support value mapping and defaults.
     * Handles three cases: column mapped (with optional value mappings), default value, or not included (NULL).
     */
    private static buildAlterFieldMappingColumnSQL(tableName: string, propertyName: string, fieldMapping?: { columnPosition?: number; defaultValue?: string; valueMappings?: { sourceId: string; databaseId: string }[] }): string[] {
        if (!fieldMapping) {
            return [`ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR DEFAULT NULL`];
        }

        if (fieldMapping.columnPosition !== undefined) {
            const sql: string[] = [`ALTER TABLE ${tableName} RENAME column${fieldMapping.columnPosition} TO ${propertyName}`];

            if (fieldMapping.valueMappings && fieldMapping.valueMappings.length > 0) {
                sql.push(...DuckDBUtils.getDeleteAndUpdateSQL(tableName, propertyName, fieldMapping.valueMappings, false));
            }

            return sql;
        }

        if (fieldMapping.defaultValue !== undefined) {
            return [`ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR DEFAULT '${fieldMapping.defaultValue}'`];
        }

        return [`ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR DEFAULT NULL`];
    }

    private static buildAlterIdColumnsSQL(tableName: string, mapping: StationColumnMappingDto): string[] {
        const sql: string[] = [];

        if (mapping.wmoIdColumnPosition !== undefined) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${mapping.wmoIdColumnPosition} TO ${this.WMO_ID_PROPERTY}`);
        } else {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.WMO_ID_PROPERTY} VARCHAR DEFAULT NULL`);
        }

        if (mapping.wigosIdColumnPosition !== undefined) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${mapping.wigosIdColumnPosition} TO ${this.WIGOS_ID_PROPERTY}`);
        } else {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.WIGOS_ID_PROPERTY} VARCHAR DEFAULT NULL`);
        }

        if (mapping.icaoIdColumnPosition !== undefined) {
            sql.push(`ALTER TABLE ${tableName} RENAME column${mapping.icaoIdColumnPosition} TO ${this.ICAO_ID_PROPERTY}`);
        } else {
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${this.ICAO_ID_PROPERTY} VARCHAR DEFAULT NULL`);
        }

        return sql;
    }

    private static buildAlterDatesColumnSQL(tableName: string, mapping: StationColumnMappingDto): string[] {
        return [
            ...this.buildAlterDateColumnSQL(tableName, this.DATE_ESTABLISHED_PROPERTY, mapping.dateEstablishedDefinition),
            ...this.buildAlterDateColumnSQL(tableName, this.DATE_CLOSED_PROPERTY, mapping.dateClosedDefinition),
        ];
    }

    /**
     * Builds SQL to transform a single date column using DateTimeDefinition.
     * Follows the same try_strptime pattern as TabularImportTransformer.buildAlterDateTimeColumnSQL,
     * but station dates are optional so NULLs are kept (no DELETE WHERE NULL, no SET NOT NULL),
     * no UTC offset conversion, and no UNPIVOT for day columns (single day column only).
     */
    private static buildAlterDateColumnSQL(tableName: string, propertyName: string, definition?: DateTimeDefinition): string[] {
        if (!definition) {
            return [`ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR DEFAULT NULL`];
        }

        const sql: string[] = [];
        let expectedDatetimeFormat: string;

        if (definition.dateTimeInSingleColumn !== undefined) {
            const dateTimeDef = definition.dateTimeInSingleColumn;
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.columnPosition} TO ${propertyName}`);
            expectedDatetimeFormat = dateTimeDef.datetimeFormat;

        } else if (definition.dateTimeInTwoColumns !== undefined) {
            const dateTimeDef = definition.dateTimeInTwoColumns;
            const dateCol = `${propertyName}_date_col`;
            const timeCol = `${propertyName}_time_col`;

            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.dateColumn.columnPosition} TO ${dateCol}`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${dateTimeDef.timeColumn.columnPosition} TO ${timeCol}`);
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR`);
            sql.push(`UPDATE ${tableName} SET ${propertyName} = ${dateCol} || ' ' || ${timeCol}`);

            expectedDatetimeFormat = `${dateTimeDef.dateColumn.dateFormat} ${dateTimeDef.timeColumn.timeFormat}`;

        } else if (definition.dateTimeInMultipleColumns !== undefined) {
            const dateFormat = '%Y-%m-%d';
            let timeFormat = '%H:%M:%S';
            const multiDef = definition.dateTimeInMultipleColumns;

            const yearCol = `${propertyName}_year_col`;
            const monthCol = `${propertyName}_month_col`;
            const dayCol = `${propertyName}_day_col`;
            const timeCol = `${propertyName}_time_col`;

            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${multiDef.yearColumnPosition} TO ${yearCol}`);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${multiDef.monthColumnPosition} TO ${monthCol}`);

            // Single day column only (no UNPIVOT for station dates)
            const dayColumnPosition = parseInt(multiDef.dayColumnPosition, 10);
            sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${dayColumnPosition} TO ${dayCol}`);
            sql.push(`UPDATE ${tableName} SET ${dayCol} = lpad(${dayCol}, 2, '0')`);

            // Hour definition
            const hourDefinition: HourDefinition = multiDef.hourDefinition;
            if (hourDefinition.timeColumn !== undefined) {
                timeFormat = hourDefinition.timeColumn.timeFormat;
                sql.push(`ALTER TABLE ${tableName} RENAME COLUMN column${hourDefinition.timeColumn.columnPosition} TO ${timeCol}`);
            } else if (hourDefinition.defaultHour !== undefined) {
                const strHour = StringUtils.addLeadingZero(hourDefinition.defaultHour);
                sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${timeCol} VARCHAR`);
                sql.push(`UPDATE ${tableName} SET ${timeCol} = '${strHour}:00:00'`);
            }

            // Combine into a single date time column
            sql.push(`ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR`);
            sql.push(`UPDATE ${tableName} SET ${propertyName} = ${yearCol} || '-' || ${monthCol} || '-' || ${dayCol} || ' ' || ${timeCol}`);

            expectedDatetimeFormat = `${dateFormat} ${timeFormat}`;

        } else {
            throw new Error("Date time interpretation not valid");
        }

        // Convert to valid timestamp using try_strptime (safe for messy data)
        // Station dates are optional, so keep NULLs (no DELETE, no SET NOT NULL)
        sql.push(`UPDATE ${tableName} SET ${propertyName} = try_strptime(${propertyName}, '${expectedDatetimeFormat}')`);
        sql.push(`ALTER TABLE ${tableName} ALTER COLUMN ${propertyName} TYPE TIMESTAMP USING strptime(${propertyName}, '%Y-%m-%d %H:%M:%S')`);

        return sql;
    }

    private static buildAlterCommentColumnSQL(tableName: string, mapping: StationColumnMappingDto): string[] {
        if (mapping.commentColumnPosition !== undefined) {
            return [`ALTER TABLE ${tableName} RENAME column${mapping.commentColumnPosition} TO ${this.COMMENT_PROPERTY}`];
        }
        return [`ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT_PROPERTY} VARCHAR DEFAULT NULL`];
    }

    private static buildRemoveDuplicatesSQL(tableName: string): string {
        // Remove duplicates based on the primary key (id).
        // Keep the last occurrence by using row_number() ordered by rowid in descending order.
        // DuckDB automatically assigns a rowid to each row, with later rows having higher rowids.
        return `DELETE FROM ${tableName} WHERE rowid IN (
            SELECT rowid FROM (
                SELECT rowid, ROW_NUMBER() OVER (
                    PARTITION BY ${this.ID_PROPERTY}
                    ORDER BY rowid DESC
                ) as rn
                FROM ${tableName}
            ) WHERE rn > 1
        )`;
    }

}
