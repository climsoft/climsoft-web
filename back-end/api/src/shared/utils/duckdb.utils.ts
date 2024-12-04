import { Database, TableData } from "duckdb-async";

export class DuckDBUtils {

    public static async getRenameDefaultColumnNamesSQL(duckdb: Database, tableName: string): Promise<string> {
        // As of 12/08/2024 DuckDB uses different column suffixes on default column names depending on the number of columns of the csv file imported.
        // For instance, when columns are < 10, then default column name will be 'column0', and when > 10, default column name will be 'column00'. 
        // This function aims to ensure that the column names are corrected to the suffix expected, that is, 'column0'  

        const sourceColumnNames: string[] = (await duckdb.all(`DESCRIBE ${tableName}`)).map(item => (item.column_name));
        let sql: string = "";
        for (let i = 0; i < sourceColumnNames.length; i++) {
            sql = sql + `ALTER TABLE ${tableName} RENAME ${sourceColumnNames[i]} TO column${i};`;
        }
        return sql;
    }

    public static getDeleteAndUpdateSQL(tableName: string, columnName: string, valuesToFetch: { sourceId: string, databaseId: string | number }[], includeNullDeletes: boolean): string {
        // Add single quotes that will be used for the alter sqls
        valuesToFetch = valuesToFetch.map(item => {
            return { sourceId: `'${item.sourceId}'`, databaseId: `'${item.databaseId}'` }
        });

        // Delete any record that is not supposed to be fetched .    
        let sql = `DELETE FROM ${tableName} WHERE ${columnName} NOT IN ( ${valuesToFetch.map(item => (item.sourceId)).join(', ')} );`;

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

    public static async getDuplicateCount(duckdb: Database, tableName: string, columnName : string) {
        // As of 29/11/2024, duckdb does not support setting unique constraints via ALTER COLUMN,
        // This implementation aims to get count of duplicate values for a specific column
  
        return  duckdb.all(
            `SELECT ${columnName}, COUNT(*)::DOUBLE AS duplicate_count FROM ${tableName} GROUP BY ${columnName} HAVING COUNT(*) > 1`
        );
    }

}