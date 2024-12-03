import { Database } from "duckdb-async";

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

}