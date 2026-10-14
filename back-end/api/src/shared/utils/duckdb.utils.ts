import { Logger } from '@nestjs/common';
import { DuckDBConnection } from '@duckdb/node-api';
import path from 'node:path';
import crypto from 'node:crypto';

export function getTableNameFromUUID(uuid: crypto.UUID): string {
    return uuid
        // replace uuid dashes with underscores
        .replaceAll('-', '_')

        // Prefix with 't_' so UUIDS starting with digits are valid SQL identifiers
        .replace(/^(\d)/, 't_$1');
}

export function getUniqueTableName(): string {
    return getTableNameFromUUID(crypto.randomUUID());
}

// TODO. Left here for future reference
/**
 * Gets a valid SQL table name from the uploaded file name by removing the extension and replacing special characters with underscores.
 * @param filePathName 
 * @returns 
 */
function getTableNameFromFileName(filePathName: string): string {
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

export class DuckDBUtils {
    private static readonly logger = new Logger(DuckDBUtils.name);


    public static buildCsvImportParams(header: boolean, rowsToSkip: number, delimiter?: string | null): string[] {

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

    /**
     * Loads a file into a scratch table for transformation.
     *
     * Ordinary (non-TEMP) tables are correct here even when several files are
     * processed at once on separate connections, because table names come from
     * `crypto.randomUUID()`. DuckDB raises a catalog write-write conflict per
     * catalog *entry*, so two connections creating differently named tables
     * never collide — measured clean at 4 and 8 concurrent workers. Unique
     * names are therefore load-bearing: do not replace them with names derived
     * from the input file or the specification.
     *
     * What does break under concurrency is index-creating DDL — `SET NOT
     * NULL`, `PRIMARY KEY`, `UNIQUE`, `CREATE INDEX` — issued after rows in
     * that table have been updated or deleted. DuckDB rewrites UPDATE into
     * delete+insert, and index entries "can only be removed after the
     * transaction that performed the delete is committed and no further
     * transactions exist that refer to the old entry"; with concurrent workers
     * that condition is never met, and the statement fails with
     * "Cannot create index with outstanding updates".
     *
     * This is the same retained-row-version behaviour that
     * `TabularImportTransformer` already worked around for column *type*
     * changes ("conflicting types ... even if they have been deleted"). The
     * cure is the same in both cases: rebuild the table with
     * `CREATE OR REPLACE TABLE ... AS SELECT`, which discards the history.
     * So keep such DDL either before any row modification, or after a
     * rebuild.
     */
    public static async createTableFromFile(conn: DuckDBConnection, filePathName: string, tableName: string, header: boolean, rowsToSkip: number, maxRows: number, delimiter?: string | null): Promise<void> {
        // Read CSV with the configured params
        const importParams = DuckDBUtils.buildCsvImportParams(header, rowsToSkip, delimiter);
        const limitClause = maxRows > 0 ? ` LIMIT ${maxRows}` : '';

        if (header) {
            const createSQL = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${filePathName}', ${importParams.join(', ')})${limitClause};`;
            await conn.run(createSQL);
            return;
        }

        // Headerless files come back with DuckDB's positional names ("column0",
        // or "column00" once there are more than 10 — the suffix width tracks
        // the column count), while every import specification addresses columns
        // 1-based. Name them on the way in rather than renaming them after.
        //
        // The alternative — ALTER TABLE RENAME per column — costs two catalog
        // statements per column, because renaming column0 to column1 while a
        // column1 still exists needs a temporary-name pass to dodge the
        // collision. On a 156-column logger file that is 312 catalog mutations,
        // measured at ~866ms per file against ~15ms for this. A `names` list is
        // applied positionally and all at once, so no collision is possible and
        // the two-pass dance is not needed.
        const columnCount: number = await DuckDBUtils.getCsvColumnCount(conn, filePathName, importParams);
        const columnNames: string = Array.from({ length: columnCount }, (_, i) => `'column${i + 1}'`).join(', ');
        const createSQL = `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv('${filePathName}', ${importParams.join(', ')}, names=[${columnNames}])${limitClause};`;
        await conn.run(createSQL);
    }

    /**
     * How many columns the CSV has, read with the same parameters the table
     * will be created with so the count matches what `read_csv` would produce.
     * `DESCRIBE` only sniffs the file's schema; it does not materialise rows.
     */
    private static async getCsvColumnCount(conn: DuckDBConnection, filePathName: string, importParams: string[]): Promise<number> {
        const reader = await conn.runAndReadAll(`DESCRIBE SELECT * FROM read_csv('${filePathName}', ${importParams.join(', ')})`);
        return reader.getRowObjects().length;
    }

    public static async getColumnNames(conn: DuckDBConnection, tableName: string): Promise<string[]> {
        const reader = await conn.runAndReadAll(`DESCRIBE ${tableName}`);
        return reader.getRowObjects().map((item: any) => item.column_name);
    }

    static getDeleteAndUpdateSQL(tableName: string, columnName: string, valuesToFetch: { sourceId: string, databaseId: string | number }[], includeNullDeletes: boolean): string[] {
        // Add single quotes that will be used for the alter sqls
        const quotedValsToFetch = valuesToFetch.map(item => {
            return { sourceId: `'${item.sourceId}'`, databaseId: `'${item.databaseId}'` }
        });

        const sql: string[] = [];

        // Delete any record that is not supposed to be fetched
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

    /**
     * Drop a working table, for use in a `finally`.
     *
     * Never throws. It runs while another error is usually already in flight,
     * and a throw from here would replace that error with a less useful one —
     * "could not drop the table" instead of whatever actually went wrong. So a
     * failure is logged and swallowed, which is all anyone can do with it: the
     * table is scratch space with a UUID name, and nothing will look for it.
     *
     * The drop has to be explicit. Closing a connection does not remove the
     * tables it created, because the catalog belongs to the DuckDB instance, so
     * a table that is not dropped here stays in memory until the API restarts.
     */
    static async dropTable(conn: DuckDBConnection, tableName: string): Promise<void> {
        try {
            await conn.run(`DROP TABLE IF EXISTS ${tableName};`);
        } catch (err) {
            DuckDBUtils.logger.warn(`Failed to drop DuckDB table ${tableName}: ${err}`);
        }
    }

    static async getRowCount(conn: DuckDBConnection, tableName: string): Promise<number> {
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
        delimiter?: string | null,
    ): Promise<{ columns: string[]; rows: string[][]; totalRowCount: number }> {

        const skippedData = { totalRowCount: 0, columns: [] as string[], rows: [] as string[][] };

        if (rowsToSkip <= 0) return skippedData;

        // Important. Use uuid here to avoid unintentionally deleting any existing table that use the file name as its table name
        const tableName: string = getTableNameFromUUID(crypto.randomUUID());
        await DuckDBUtils.createTableFromFile(
            conn,
            importFilePathName,
            tableName,
            false,
            0,
            maxPreviewRows,
            delimiter);

        try {
            skippedData.totalRowCount = await DuckDBUtils.getRowCount(conn, tableName);
            skippedData.columns = await DuckDBUtils.getColumnNames(conn, tableName);
            skippedData.rows = await DuckDBUtils.getPreviewRows(conn, tableName, rowsToSkip);
        } finally {
            await DuckDBUtils.dropTable(conn, tableName);
        }

        return skippedData;
    }

}