import { DuckDBConnection } from '@duckdb/node-api';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { ElementColumnMappingDto } from 'src/metadata/dtos/metadata-import-preview.dto';
import { PreviewError } from 'src/observation/dtos/import-preview.dto';
import { ImportErrorUtils } from 'src/shared/utils/import-error.utils';

/**
 * Static utility class that builds DuckDB SQL statements for transforming
 * imported CSV data into the elements table schema.
 */
export class ElementImportTransformer {

    // Column names matching ElementEntity @Column({ name }) values.
    // Note: entry_user_id and entry_date_time come from AppBaseEntity, the base class of ElementEntity.
    static readonly ID_PROPERTY: string = 'id';
    static readonly ABBREVIATION_PROPERTY: string = 'abbreviation';
    static readonly NAME_PROPERTY: string = 'name';
    static readonly DESCRIPTION_PROPERTY: string = 'description';
    static readonly UNITS_PROPERTY: string = 'units';
    static readonly TYPE_ID_PROPERTY: string = 'type_id';
    static readonly ENTRY_SCALE_FACTOR_PROPERTY: string = 'entry_scale_factor';
    static readonly COMMENT_PROPERTY: string = 'comment';
    // From AppBaseEntity
    static readonly ENTRY_USER_ID_PROPERTY: string = 'entry_user_id';

    /** All final column names in order for SELECT and COPY. */
    static readonly ALL_COLUMNS: string[] = [
        ElementImportTransformer.ID_PROPERTY,
        ElementImportTransformer.ABBREVIATION_PROPERTY,
        ElementImportTransformer.NAME_PROPERTY,
        ElementImportTransformer.DESCRIPTION_PROPERTY,
        ElementImportTransformer.UNITS_PROPERTY,
        ElementImportTransformer.TYPE_ID_PROPERTY,
        ElementImportTransformer.ENTRY_SCALE_FACTOR_PROPERTY,
        ElementImportTransformer.COMMENT_PROPERTY,
        ElementImportTransformer.ENTRY_USER_ID_PROPERTY,
    ];



    public static async executeTransformation(
        conn: DuckDBConnection,
        tableName: string,
        mapping: ElementColumnMappingDto,
        userId?: number,
    ): Promise<PreviewError | void> {

        const steps: { name: string; buildSql: () => string[] }[] = [
            { name: 'Id', buildSql: () => ElementImportTransformer.buildAlterIdColumnSQL(tableName, mapping) },
            { name: 'Abbreviation', buildSql: () => ElementImportTransformer.buildAlterAbbreviationColumnSQL(tableName, mapping) },
            { name: 'Name', buildSql: () => ElementImportTransformer.buildAlterNameColumnSQL(tableName, mapping) },
            { name: 'Description', buildSql: () => ElementImportTransformer.buildAlterDescriptionColumnSQL(tableName, mapping) },
            { name: 'Units', buildSql: () => ElementImportTransformer.buildAlterUnitsColumnSQL(tableName, mapping) },
            { name: 'Element Type', buildSql: () => ElementImportTransformer.buildAlterElementTypeColumnSQL(tableName, mapping) },
            { name: 'Entry Scale Factor', buildSql: () => ElementImportTransformer.buildAlterEntryScaleFactorColumnSQL(tableName, mapping) },
            { name: 'Comment', buildSql: () => ElementImportTransformer.buildAlterCommentColumnSQL(tableName, mapping) },
            {
                name: 'Finalize',
                buildSql: () => {
                    return [
                        `ALTER TABLE ${tableName} ADD COLUMN ${ElementImportTransformer.ENTRY_USER_ID_PROPERTY} INTEGER DEFAULT ${userId || 'NULL'}`,
                        ...ElementImportTransformer.buildRemoveDuplicatesSQL(tableName),
                        `CREATE OR REPLACE TABLE ${tableName} AS SELECT ${ElementImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName}`,
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
        await conn.run(`COPY (SELECT ${ElementImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName}) TO '${exportFilePath}' (HEADER, DELIMITER ',');`);
    }

    // ─── Step Builders ───────────────────────────────────────

    private static buildAlterIdColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string[] {
        return [
            `ALTER TABLE ${tableName} RENAME column${mapping.idColumnPosition} TO ${this.ID_PROPERTY}`,
            `ALTER TABLE ${tableName} ALTER COLUMN ${this.ID_PROPERTY} SET NOT NULL`,
            `ALTER TABLE ${tableName} ALTER COLUMN ${this.ID_PROPERTY} TYPE INTEGER`,
        ];
    }

    private static buildAlterAbbreviationColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string[] {
        return [
            `ALTER TABLE ${tableName} RENAME column${mapping.abbreviationColumnPosition} TO ${this.ABBREVIATION_PROPERTY}`,
            `ALTER TABLE ${tableName} ALTER COLUMN ${this.ABBREVIATION_PROPERTY} SET NOT NULL`,
        ];
    }

    private static buildAlterNameColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string[] {
        return [
            `ALTER TABLE ${tableName} RENAME column${mapping.nameColumnPosition} TO ${this.NAME_PROPERTY}`,
            `ALTER TABLE ${tableName} ALTER COLUMN ${this.NAME_PROPERTY} SET NOT NULL`,
        ];
    }

    private static buildAlterDescriptionColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string[] {
        if (mapping.descriptionColumnPosition !== undefined) {
            return [`ALTER TABLE ${tableName} RENAME column${mapping.descriptionColumnPosition} TO ${this.DESCRIPTION_PROPERTY}`];
        }
        return [`ALTER TABLE ${tableName} ADD COLUMN ${this.DESCRIPTION_PROPERTY} VARCHAR DEFAULT NULL`];
    }

    private static buildAlterUnitsColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string[] {
        if (mapping.unitsColumnPosition !== undefined) {
            return [`ALTER TABLE ${tableName} RENAME column${mapping.unitsColumnPosition} TO ${this.UNITS_PROPERTY}`];
        }
        return [`ALTER TABLE ${tableName} ADD COLUMN ${this.UNITS_PROPERTY} VARCHAR DEFAULT NULL`];
    }

    private static buildAlterElementTypeColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string[] {
        if (mapping.elementType?.columnPosition !== undefined) {
            const sql: string[] = [`ALTER TABLE ${tableName} RENAME column${mapping.elementType.columnPosition} TO ${this.TYPE_ID_PROPERTY}`];

            if (mapping.elementType.valueMappings && mapping.elementType.valueMappings.length > 0) {
                sql.push(...DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.TYPE_ID_PROPERTY, mapping.elementType.valueMappings, false));
            }

            return sql;
        } else if (mapping.elementType?.defaultValue !== undefined) {
            return [`ALTER TABLE ${tableName} ADD COLUMN ${this.TYPE_ID_PROPERTY} INTEGER DEFAULT ${mapping.elementType.defaultValue}`];
        } else {
            return [`ALTER TABLE ${tableName} ADD COLUMN ${this.TYPE_ID_PROPERTY} INTEGER DEFAULT NULL`];
        }
    }

    private static buildAlterEntryScaleFactorColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string[] {
        if (mapping.entryScaleFactorColumnPosition !== undefined) {
            return [
                `ALTER TABLE ${tableName} RENAME column${mapping.entryScaleFactorColumnPosition} TO ${this.ENTRY_SCALE_FACTOR_PROPERTY}`,
                `ALTER TABLE ${tableName} ALTER COLUMN ${this.ENTRY_SCALE_FACTOR_PROPERTY} TYPE INTEGER`,
            ];
        } else {
            return [`ALTER TABLE ${tableName} ADD COLUMN ${this.ENTRY_SCALE_FACTOR_PROPERTY} INTEGER DEFAULT NULL`];
        }

    }

    private static buildAlterCommentColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string[] {
        if (mapping.commentColumnPosition !== undefined) {
            return [`ALTER TABLE ${tableName} RENAME column${mapping.commentColumnPosition} TO ${this.COMMENT_PROPERTY}`];
        } else {
            return [`ALTER TABLE ${tableName} ADD COLUMN ${this.COMMENT_PROPERTY} VARCHAR DEFAULT NULL`];
        }
    }

    private static buildRemoveDuplicatesSQL(tableName: string): string[] {
        // Remove duplicates for each unique column (id, abbreviation, name).
        // Keep the last occurrence by using row_number() ordered by rowid in descending order.
        // DuckDB automatically assigns a rowid to each row, with later rows having higher rowids.
        // Each pass is run separately because a single row may be unique on one column but duplicate on another.
        return [this.ID_PROPERTY, this.ABBREVIATION_PROPERTY, this.NAME_PROPERTY].map(col =>
            `DELETE FROM ${tableName} WHERE rowid IN (
                SELECT rowid FROM (
                    SELECT rowid, ROW_NUMBER() OVER (
                        PARTITION BY ${col}
                        ORDER BY rowid DESC
                    ) as rn
                    FROM ${tableName}
                ) WHERE rn > 1
            )`
        );
    }

}
