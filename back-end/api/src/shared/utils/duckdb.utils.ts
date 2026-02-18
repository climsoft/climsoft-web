import { Database } from "duckdb-async";
import * as path from 'node:path';

export class DuckDBUtils {

    static buildCsvImportParams(rowsToSkip: number, delimiter?: string): string[] {
        // Note.
        // `header = false` is important because it makes sure that duckdb uses it's default column names instead of the headers that come with the file.
        // As of 14/01/2026. `strict_mode = false` is important because large files(e.g 60 MB) throw a parse error when imported via duckdb

        const params: string[] = [
            'header = false',
            `skip = ${rowsToSkip}`,
            'all_varchar = true',
            'strict_mode = false',
        ];
        if (delimiter) {
            params.push(`delim = '${delimiter}'`);
        }
        return params;
    }


    /**
     * Gets a valid SQL table name from the uploaded file name by removing the extension and replacing special characters with underscores.
     * @param filePathName 
     * @returns 
     */
    public static getTableNameFromFileName(filePathName: string): string {
        return path.basename(filePathName, path.extname(filePathName)).replace(/\s+/g, '_');
    }

    static async getRenameDefaultColumnNamesSQL(duckdb: Database, tableName: string): Promise<string> {
        // As of 12/08/2024 DuckDB uses different column suffixes on default column names depending on the number of columns of the csv file imported.
        // For instance, when columns are < 10, then default column name will be 'column0', and when > 10, default column name will be 'column00'.
        // This function normalises column names to 1-based indices (column1, column2, ...) matching user expectations where columns are counted starting at 1.

        const sourceColumnNames: string[] = (await duckdb.all(`DESCRIBE ${tableName}`)).map(item => (item.column_name));
        let sql: string = '';
        // Two-pass rename to avoid collisions (e.g. renaming column0 → column1 when column1 already exists).
        // Pass 1: rename all columns to temporary names
        for (let i = 0; i < sourceColumnNames.length; i++) {
            sql = sql + `ALTER TABLE ${tableName} RENAME ${sourceColumnNames[i]} TO __temp_col_${i};`;
        }
        // Pass 2: rename temporary names to final 1-based names
        for (let i = 0; i < sourceColumnNames.length; i++) {
            sql = sql + `ALTER TABLE ${tableName} RENAME __temp_col_${i} TO column${i + 1};`;
        }
        return sql;
    }

    static getDeleteAndUpdateSQL(tableName: string, columnName: string, valuesToFetch: { sourceId: string, databaseId: string | number }[], includeNullDeletes: boolean): string {
        // Add single quotes that will be used for the alter sqls
        valuesToFetch = valuesToFetch.map(item => {
            return { sourceId: `'${item.sourceId}'`, databaseId: `'${item.databaseId}'` }
        });

        // Delete any record that is not supposed to be fetched .    
        let sql;
        if (includeNullDeletes) {
            sql = `DELETE FROM ${tableName} WHERE ${columnName} NOT IN ( ${valuesToFetch.map(item => (item.sourceId)).join(', ')} );`;
        } else {
            sql = `DELETE FROM ${tableName} WHERE ${columnName} IS NOT NULL AND ${columnName} NOT IN ( ${valuesToFetch.map(item => (item.sourceId)).join(', ')} );`;
        }

        // Update the source element ids with the equivalent database ids
        for (const value of valuesToFetch) {
            sql = sql + `UPDATE ${tableName} SET ${columnName} = ${value.databaseId} WHERE ${columnName} = ${value.sourceId};`;
        }

        return sql;
    }

    static async getDuplicateCount(duckdb: Database, tableName: string, columnName: string) {
        // As of 29/11/2024, duckdb does not support setting unique constraints via ALTER COLUMN,
        // This implementation aims to get count of duplicate values for a specific column

        return duckdb.all(
            `SELECT ${columnName}, COUNT(*)::DOUBLE AS duplicate_count FROM ${tableName} GROUP BY ${columnName} HAVING COUNT(*) > 1`
        );
    }

}