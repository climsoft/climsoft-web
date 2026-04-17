import { DuckDBConnection } from '@duckdb/node-api';
import * as path from 'node:path';

export class DuckDBUtils {

    public static buildCsvImportParams(header: boolean, rowsToSkip: number, delimiter?: string): string[] {

        const params: string[] = [];

        params.push(header ? 'header = true' : 'header = false');

        if (rowsToSkip) {
            params.push(`skip = ${rowsToSkip}`);
        }
        if (delimiter) {
            params.push(`delim = '${delimiter}'`);
        }

        // all as var char allows for rapid ingestion of data
        params.push('all_varchar = true');

        // Note.  As of 14/01/2026. `strict_mode = false` is important because large files(e.g 60 MB) throw a parse error when imported via duckdb
        params.push('strict_mode = false');
        return params;
    }

    public static async createTableFromFile(conn: DuckDBConnection, filePathName: string, tableName: string, header: boolean, rowsToSkip: number, maxRows: number, delimiter?: string): Promise<void> {
        // Read CSV with the configured params
        const importParams = DuckDBUtils.buildCsvImportParams(header, rowsToSkip, delimiter);
        const limitClause = maxRows > 0 ? ` LIMIT ${maxRows}` : '';

        // Note: The `read_csv` function in DuckDB automatically infers the column names as "column0", "column1", or "column00", "column01", etc. based on the column positions.
        const createSQL = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${filePathName}', ${importParams.join(', ')})${limitClause};`;

        await conn.run(createSQL);

        if (!header) {
            // If headers are not to be recognised then
            // Rename columns to normalized names (column0, column1, ...)
            const renameSQLs = await DuckDBUtils.getRenameDefaultColumnNamesSQL(conn, tableName);
            await conn.run(renameSQLs.join('; '));
        }

    }


    /**
     * Gets a valid SQL table name from the uploaded file name by removing the extension and replacing special characters with underscores.
     * @param filePathName 
     * @returns 
     */
    public static getTableNameFromFileName(filePathName: string): string {
        return path
            // Extract file name without directory and extension
            .basename(filePathName, path.extname(filePathName))

            // Replace any sequence of non-alphanumeric characters with underscore
            // e.g. "my-data file!" → "my_data_file_"
            .replace(/[^a-zA-Z0-9]+/g, '_')

            // Remove leading and trailing underscores
            // e.g. "_my_data_" → "my_data"
            .replace(/^_+|_+$/g, '')

            // Convert to lowercase for consistency (useful for DB table names)
            .toLowerCase();
    }

    public static async getColumnNames(conn: DuckDBConnection, tableName: string): Promise<string[]> {
        const reader = await conn.runAndReadAll(`DESCRIBE ${tableName}`);
        return reader.getRowObjects().map((item: any) => item.column_name);
    }

    public static async getRenameDefaultColumnNamesSQL(conn: DuckDBConnection, tableName: string): Promise<string[]> {
        // As of 12/08/2024 DuckDB uses different column suffixes on default column names depending on the number of columns of the csv file imported.
        // For instance, when columns are < 10, then default column name will be 'column0', and when > 10, default column name will be 'column00'.
        // This function normalises column names to 1-based indices (column1, column2, ...) matching user expectations where columns are counted starting at 1.

        const sourceColumnNames: string[] = await DuckDBUtils.getColumnNames(conn, tableName);

        const sql: string[] = [];
        // Two-pass rename to avoid collisions (e.g. renaming column0 → column1 when column1 already exists).
        // Pass 1: rename all columns to temporary names
        for (let i = 0; i < sourceColumnNames.length; i++) {
            sql.push(`ALTER TABLE ${tableName} RENAME ${sourceColumnNames[i]} TO __temp_col_${i}`);
        }
        // Pass 2: rename temporary names to final 1-based names
        for (let i = 0; i < sourceColumnNames.length; i++) {
            sql.push(`ALTER TABLE ${tableName} RENAME __temp_col_${i} TO column${i + 1}`);
        }
        return sql;
    }

    static getDeleteAndUpdateSQL(tableName: string, columnName: string, valuesToFetch: { sourceId: string, databaseId: string | number }[], includeNullDeletes: boolean): string[] {
        // Add single quotes that will be used for the alter sqls
        const quotedValsToFetch = valuesToFetch.map(item => {
            return { sourceId: `'${item.sourceId}'`, databaseId: `'${item.databaseId}'` }
        });

        const sql: string[] = [];

        // Delete any record that is not supposed to be fetched .
        if (includeNullDeletes) {
            sql.push(`DELETE FROM ${tableName} WHERE ${columnName} NOT IN ( ${quotedValsToFetch.map(item => (item.sourceId)).join(', ')} )`);
        } else {
            sql.push(`DELETE FROM ${tableName} WHERE ${columnName} IS NOT NULL AND ${columnName} NOT IN ( ${quotedValsToFetch.map(item => (item.sourceId)).join(', ')} )`);
        }

        // Update the source element ids with the equivalent database ids
        for (const value of quotedValsToFetch) {
            sql.push(`UPDATE ${tableName} SET ${columnName} = ${value.databaseId} WHERE ${columnName} = ${value.sourceId}`);
        }

        return sql;
    }

    static async getDuplicateCount(conn: DuckDBConnection, tableName: string, columnName: string) {
        // As of 29/11/2024, duckdb does not support setting unique constraints via ALTER COLUMN,
        // This implementation aims to get count of duplicate values for a specific column

        const reader = await conn.runAndReadAll(
            `SELECT ${columnName}, COUNT(*)::DOUBLE AS duplicate_count FROM ${tableName} GROUP BY ${columnName} HAVING COUNT(*) > 1`
        );
        return reader.getRowObjects();
    }

    // ─── Preview Helpers ─────────────────────────────────────
    // Used by ImportPreviewService and MetadataImportPreviewService to build table previews.

    static async getPreviewRowCount(conn: DuckDBConnection, tableName: string): Promise<number> {
        const reader = await conn.runAndReadAll(`SELECT COUNT(*)::INTEGER AS cnt FROM ${tableName}`);
        const rows = reader.getRowObjects();
        return Number(rows[0]?.cnt ?? 0);
    }

    static async getPreviewRows(conn: DuckDBConnection, tableName: string, limit: number): Promise<string[][]> {
        const reader = await conn.runAndReadAll(`SELECT * FROM ${tableName} LIMIT ${limit}`);
        return DuckDBUtils.convertToPreviewRows(reader.getRowObjects());
    }

    static convertToPreviewRows(tableData: any[]): string[][] {
        if (tableData.length === 0) return [];
        const keys = Object.keys(tableData[0]);
        return tableData.map((row: any) => keys.map(key => {
            const val = row[key];
            return val === null || val === undefined ? '' : String(val);
        }));
    }

    static async getSkippedData(
        conn: DuckDBConnection,
        importFilePathName: string,
        rowsToSkip: number,
        maxPreviewRows: number,
        delimiter?: string,
    ): Promise<{ columns: string[]; rows: string[][]; totalRowCount: number }> {
        const skippedData = { totalRowCount: 0, columns: [] as string[], rows: [] as string[][] };

        if (rowsToSkip <= 0) return skippedData;

        const tableName = `${DuckDBUtils.getTableNameFromFileName(importFilePathName)}_skipped_data`;
        await DuckDBUtils.createTableFromFile(conn, importFilePathName, tableName, false, 0, rowsToSkip, delimiter);

        skippedData.totalRowCount = await DuckDBUtils.getPreviewRowCount(conn, tableName);
        skippedData.columns = await DuckDBUtils.getColumnNames(conn, tableName);
        skippedData.rows = await DuckDBUtils.getPreviewRows(conn, tableName, maxPreviewRows);

        return skippedData;
    }

}