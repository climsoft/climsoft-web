import { DuckDBConnection } from '@duckdb/node-api';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { StationColumnMappingDto, MetadataPreviewError } from 'src/metadata/dtos/metadata-import-preview.dto';
import { CreateStationDto } from '../dtos/create-station.dto';

/**
 * Static utility class that builds DuckDB SQL statements for transforming
 * imported CSV data into the stations table schema.
 */
export class StationImportTransformer {

    static readonly ID_PROPERTY: keyof CreateStationDto = 'id';
    static readonly NAME_PROPERTY: keyof CreateStationDto = 'name';
    static readonly DESCRIPTION_PROPERTY: keyof CreateStationDto = 'description';
    static readonly LATITUDE_PROPERTY: keyof CreateStationDto = 'latitude';
    static readonly LONGITUDE_PROPERTY: keyof CreateStationDto = 'longitude';
    static readonly ELEVATION_PROPERTY: keyof CreateStationDto = 'elevation';
    static readonly OBS_PROC_METHOD_PROPERTY: keyof CreateStationDto = 'stationObsProcessingMethod';
    static readonly OBS_ENVIRONMENT_ID_PROPERTY: keyof CreateStationDto = 'stationObsEnvironmentId';
    static readonly OBS_FOCUS_ID_PROPERTY: keyof CreateStationDto = 'stationObsFocusId';
    static readonly OWNER_ID_PROPERTY: keyof CreateStationDto = 'ownerId';
    static readonly OPERATOR_ID_PROPERTY: keyof CreateStationDto = 'operatorId';
    static readonly WMO_ID_PROPERTY: keyof CreateStationDto = 'wmoId';
    static readonly WIGOS_ID_PROPERTY: keyof CreateStationDto = 'wigosId';
    static readonly ICAO_ID_PROPERTY: keyof CreateStationDto = 'icaoId';
    static readonly STATUS_PROPERTY: keyof CreateStationDto = 'status';
    static readonly DATE_ESTABLISHED_PROPERTY: keyof CreateStationDto = 'dateEstablished';
    static readonly DATE_CLOSED_PROPERTY: keyof CreateStationDto = 'dateClosed';
    static readonly COMMENT_PROPERTY: keyof CreateStationDto = 'comment';

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
    ];

    public static async loadTableFromFile(conn: DuckDBConnection, filePathName: string, rowsToSkip: number, maxRows: number, delimiter: string | undefined): Promise<string> {
        const importParams = DuckDBUtils.buildCsvImportParams(rowsToSkip, delimiter);
        const limitClause = maxRows > 0 ? ` LIMIT ${maxRows}` : '';
        const tableName: string = DuckDBUtils.getTableNameFromFileName(filePathName);

        const createSQL = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${filePathName}', ${importParams.join(', ')})${limitClause};`;
        await conn.run(createSQL);

        const renameSQL = await DuckDBUtils.getRenameDefaultColumnNamesSQL(conn, tableName);
        await conn.run(renameSQL);

        return tableName;
    }

    public static async executeTransformation(
        conn: DuckDBConnection,
        tableName: string,
        mapping: StationColumnMappingDto,
    ): Promise<MetadataPreviewError | void> {

        const steps: { name: string; buildSql: () => string }[] = [
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
                    // Select only the final columns we need, discarding unmapped CSV columns
                    const existingCols = StationImportTransformer.ALL_COLUMNS;
                    return `CREATE OR REPLACE TABLE ${tableName} AS SELECT ${existingCols.join(', ')} FROM ${tableName};`;
                }
            },
        ];

        for (const step of steps) {
            try {
                const sql = step.buildSql();
                if (sql) {
                    await conn.run(sql);
                }
            } catch (error) {
                return StationImportTransformer.classifyError(error, step.name);
            }
        }
    }

    public static async exportTransformedDataToFile(conn: DuckDBConnection, tableName: string, exportFilePath: string): Promise<void> {
        await conn.run(`COPY (SELECT ${StationImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName}) TO '${exportFilePath}' (HEADER, DELIMITER ',');`);
    }

    // ─── Step Builders ───────────────────────────────────────

    private static buildAlterIdColumnSQL(tableName: string, mapping: StationColumnMappingDto): string {
        let sql = `ALTER TABLE ${tableName} RENAME column${mapping.idColumnPosition} TO ${this.ID_PROPERTY};`;
        sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.ID_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private static buildAlterNameColumnSQL(tableName: string, mapping: StationColumnMappingDto): string {
        let sql = `ALTER TABLE ${tableName} RENAME column${mapping.nameColumnPosition} TO ${this.NAME_PROPERTY};`;
        sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.NAME_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private static buildAlterDescriptionColumnSQL(tableName: string, mapping: StationColumnMappingDto): string {
        if (mapping.descriptionColumnPosition !== undefined) {
            return `ALTER TABLE ${tableName} RENAME column${mapping.descriptionColumnPosition} TO ${this.DESCRIPTION_PROPERTY};`;
        }
        return `ALTER TABLE ${tableName} ADD COLUMN ${this.DESCRIPTION_PROPERTY} VARCHAR DEFAULT NULL;`;
    }

    private static buildAlterLatLongElevationColumnSQL(tableName: string, mapping: StationColumnMappingDto): string {
        let sql = '';

        if (mapping.latitudeColumnPosition !== undefined) {
            sql += `ALTER TABLE ${tableName} RENAME column${mapping.latitudeColumnPosition} TO ${this.LATITUDE_PROPERTY};`;
            sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.LATITUDE_PROPERTY} TYPE DOUBLE;`;
        } else {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${this.LATITUDE_PROPERTY} DOUBLE DEFAULT NULL;`;
        }

        if (mapping.longitudeColumnPosition !== undefined) {
            sql += `ALTER TABLE ${tableName} RENAME column${mapping.longitudeColumnPosition} TO ${this.LONGITUDE_PROPERTY};`;
            sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.LONGITUDE_PROPERTY} TYPE DOUBLE;`;
        } else {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${this.LONGITUDE_PROPERTY} DOUBLE DEFAULT NULL;`;
        }

        if (mapping.elevationColumnPosition !== undefined) {
            sql += `ALTER TABLE ${tableName} RENAME column${mapping.elevationColumnPosition} TO ${this.ELEVATION_PROPERTY};`;
            sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEVATION_PROPERTY} TYPE DOUBLE;`;
        } else {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${this.ELEVATION_PROPERTY} DOUBLE DEFAULT NULL;`;
        }

        return sql;
    }

    /**
     * Generic builder for fields that support value mapping and defaults.
     * Handles three cases: column mapped (with optional value mappings), default value, or not included (NULL).
     */
    private static buildAlterFieldMappingColumnSQL(tableName: string, propertyName: string, fieldMapping?: { columnPosition?: number; defaultValue?: string; valueMappings?: { sourceId: string; databaseId: string }[] }): string {
        if (!fieldMapping) {
            return `ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR DEFAULT NULL;`;
        }

        if (fieldMapping.columnPosition !== undefined) {
            let sql = `ALTER TABLE ${tableName} RENAME column${fieldMapping.columnPosition} TO ${propertyName};`;

            if (fieldMapping.valueMappings && fieldMapping.valueMappings.length > 0) {
                sql += DuckDBUtils.getDeleteAndUpdateSQL(tableName, propertyName, fieldMapping.valueMappings, false);
            }

            return sql;
        }

        if (fieldMapping.defaultValue !== undefined) {
            return `ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR DEFAULT '${fieldMapping.defaultValue}';`;
        }

        return `ALTER TABLE ${tableName} ADD COLUMN ${propertyName} VARCHAR DEFAULT NULL;`;
    }

    private static buildAlterIdColumnsSQL(tableName: string, mapping: StationColumnMappingDto): string {
        let sql = '';

        if (mapping.wmoIdColumnPosition !== undefined) {
            sql += `ALTER TABLE ${tableName} RENAME column${mapping.wmoIdColumnPosition} TO ${this.WMO_ID_PROPERTY};`;
        } else {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${this.WMO_ID_PROPERTY} VARCHAR DEFAULT NULL;`;
        }

        if (mapping.wigosIdColumnPosition !== undefined) {
            sql += `ALTER TABLE ${tableName} RENAME column${mapping.wigosIdColumnPosition} TO ${this.WIGOS_ID_PROPERTY};`;
        } else {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${this.WIGOS_ID_PROPERTY} VARCHAR DEFAULT NULL;`;
        }

        if (mapping.icaoIdColumnPosition !== undefined) {
            sql += `ALTER TABLE ${tableName} RENAME column${mapping.icaoIdColumnPosition} TO ${this.ICAO_ID_PROPERTY};`;
        } else {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${this.ICAO_ID_PROPERTY} VARCHAR DEFAULT NULL;`;
        }

        return sql;
    }

    private static buildAlterDatesColumnSQL(tableName: string, mapping: StationColumnMappingDto): string {
        let sql = '';

        if (mapping.dateEstablishedColumnPosition !== undefined) {
            sql += `ALTER TABLE ${tableName} RENAME column${mapping.dateEstablishedColumnPosition} TO ${this.DATE_ESTABLISHED_PROPERTY};`;
            sql += `UPDATE ${tableName} SET ${this.DATE_ESTABLISHED_PROPERTY} = strftime(${this.DATE_ESTABLISHED_PROPERTY}::DATE, '%Y-%m-%dT%H:%M:%S.%g') || 'Z' WHERE ${this.DATE_ESTABLISHED_PROPERTY} IS NOT NULL;`;
        } else {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${this.DATE_ESTABLISHED_PROPERTY} VARCHAR DEFAULT NULL;`;
        }

        if (mapping.dateClosedColumnPosition !== undefined) {
            sql += `ALTER TABLE ${tableName} RENAME column${mapping.dateClosedColumnPosition} TO ${this.DATE_CLOSED_PROPERTY};`;
            sql += `UPDATE ${tableName} SET ${this.DATE_CLOSED_PROPERTY} = strftime(${this.DATE_CLOSED_PROPERTY}::DATE, '%Y-%m-%dT%H:%M:%S.%g') || 'Z' WHERE ${this.DATE_CLOSED_PROPERTY} IS NOT NULL;`;
        } else {
            sql += `ALTER TABLE ${tableName} ADD COLUMN ${this.DATE_CLOSED_PROPERTY} VARCHAR DEFAULT NULL;`;
        }

        return sql;
    }

    private static buildAlterCommentColumnSQL(tableName: string, mapping: StationColumnMappingDto): string {
        if (mapping.commentColumnPosition !== undefined) {
            return `ALTER TABLE ${tableName} RENAME column${mapping.commentColumnPosition} TO ${this.COMMENT_PROPERTY};`;
        }
        return `ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT_PROPERTY} VARCHAR DEFAULT NULL;`;
    }

    // ─── Error Classification ────────────────────────────────

    private static classifyError(error: unknown, stepName: string): MetadataPreviewError {
        const msg = error instanceof Error ? error.message : String(error);

        if (msg.includes('does not have a column named') || msg.includes('Referenced column') || msg.includes('not found in FROM clause')) {
            return {
                type: 'COLUMN_NOT_FOUND',
                message: `${stepName}: A column referenced in the mapping was not found. Check that the column positions are correct.`,
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
            message: `${stepName}: An error occurred while processing the file.`,
            detail: msg,
        };
    }
}
