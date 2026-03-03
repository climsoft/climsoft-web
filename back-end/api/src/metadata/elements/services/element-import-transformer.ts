import { DuckDBConnection } from '@duckdb/node-api';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { ElementColumnMappingDto, MetadataPreviewError } from 'src/metadata/dtos/metadata-import-preview.dto';
import { CreateViewElementDto } from '../dtos/elements/create-view-element.dto';

/**
 * Static utility class that builds DuckDB SQL statements for transforming
 * imported CSV data into the elements table schema.
 */
export class ElementImportTransformer {

    static readonly ID_PROPERTY: keyof CreateViewElementDto = 'id';
    static readonly ABBREVIATION_PROPERTY: keyof CreateViewElementDto = 'abbreviation';
    static readonly NAME_PROPERTY: keyof CreateViewElementDto = 'name';
    static readonly DESCRIPTION_PROPERTY: keyof CreateViewElementDto = 'description';
    static readonly UNITS_PROPERTY: keyof CreateViewElementDto = 'units';
    static readonly TYPE_ID_PROPERTY: keyof CreateViewElementDto = 'typeId';
    static readonly ENTRY_SCALE_FACTOR_PROPERTY: keyof CreateViewElementDto = 'entryScaleFactor';
    static readonly COMMENT_PROPERTY: keyof CreateViewElementDto = 'comment';

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
        mapping: ElementColumnMappingDto,
    ): Promise<MetadataPreviewError | void> {

        const steps: { name: string; buildSql: () => string }[] = [
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
                    const existingCols = ElementImportTransformer.ALL_COLUMNS;
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
                return ElementImportTransformer.classifyError(error, step.name);
            }
        }
    }

    public static async exportTransformedDataToFile(conn: DuckDBConnection, tableName: string, exportFilePath: string): Promise<void> {
        await conn.run(`COPY (SELECT ${ElementImportTransformer.ALL_COLUMNS.join(', ')} FROM ${tableName}) TO '${exportFilePath}' (HEADER, DELIMITER ',');`);
    }

    // ─── Step Builders ───────────────────────────────────────

    private static buildAlterIdColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string {
        let sql = `ALTER TABLE ${tableName} RENAME column${mapping.idColumnPosition} TO ${this.ID_PROPERTY};`;
        sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.ID_PROPERTY} SET NOT NULL;`;
        sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.ID_PROPERTY} TYPE INTEGER;`;
        return sql;
    }

    private static buildAlterAbbreviationColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string {
        let sql = `ALTER TABLE ${tableName} RENAME column${mapping.abbreviationColumnPosition} TO ${this.ABBREVIATION_PROPERTY};`;
        sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.ABBREVIATION_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private static buildAlterNameColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string {
        let sql = `ALTER TABLE ${tableName} RENAME column${mapping.nameColumnPosition} TO ${this.NAME_PROPERTY};`;
        sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.NAME_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private static buildAlterDescriptionColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string {
        if (mapping.descriptionColumnPosition !== undefined) {
            return `ALTER TABLE ${tableName} RENAME column${mapping.descriptionColumnPosition} TO ${this.DESCRIPTION_PROPERTY};`;
        }
        return `ALTER TABLE ${tableName} ADD COLUMN ${this.DESCRIPTION_PROPERTY} VARCHAR DEFAULT NULL;`;
    }

    private static buildAlterUnitsColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string {
        if (mapping.unitsColumnPosition !== undefined) {
            let sql = `ALTER TABLE ${tableName} RENAME column${mapping.unitsColumnPosition} TO ${this.UNITS_PROPERTY};`;
            sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.UNITS_PROPERTY} SET NOT NULL;`;
            return sql;
        }
        return `ALTER TABLE ${tableName} ADD COLUMN ${this.UNITS_PROPERTY} VARCHAR DEFAULT NULL;`;
    }

    private static buildAlterElementTypeColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string {
        if (!mapping.elementType) {
            return `ALTER TABLE ${tableName} ADD COLUMN ${this.TYPE_ID_PROPERTY} VARCHAR DEFAULT NULL;`;
        }

        if (mapping.elementType.columnPosition !== undefined) {
            let sql = `ALTER TABLE ${tableName} RENAME column${mapping.elementType.columnPosition} TO ${this.TYPE_ID_PROPERTY};`;

            if (mapping.elementType.valueMappings && mapping.elementType.valueMappings.length > 0) {
                sql += DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.TYPE_ID_PROPERTY, mapping.elementType.valueMappings, false);
            }

            return sql;
        }

        if (mapping.elementType.defaultValue !== undefined) {
            return `ALTER TABLE ${tableName} ADD COLUMN ${this.TYPE_ID_PROPERTY} VARCHAR DEFAULT '${mapping.elementType.defaultValue}';`;
        }

        return `ALTER TABLE ${tableName} ADD COLUMN ${this.TYPE_ID_PROPERTY} VARCHAR DEFAULT NULL;`;
    }

    private static buildAlterEntryScaleFactorColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string {
        if (mapping.entryScaleFactorColumnPosition !== undefined) {
            let sql = `ALTER TABLE ${tableName} RENAME column${mapping.entryScaleFactorColumnPosition} TO ${this.ENTRY_SCALE_FACTOR_PROPERTY};`;
            sql += `ALTER TABLE ${tableName} ALTER COLUMN ${this.ENTRY_SCALE_FACTOR_PROPERTY} TYPE DOUBLE;`;
            return sql;
        }
        return `ALTER TABLE ${tableName} ADD COLUMN ${this.ENTRY_SCALE_FACTOR_PROPERTY} DOUBLE DEFAULT NULL;`;
    }

    private static buildAlterCommentColumnSQL(tableName: string, mapping: ElementColumnMappingDto): string {
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
