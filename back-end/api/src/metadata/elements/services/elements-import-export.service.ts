import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common';
import { FileIOService } from 'src/shared/services/file-io.service';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { CreateViewElementDto } from '../dtos/elements/create-view-element.dto';
import { ElementsService } from './elements.service';
import { ElementTypesService } from './element-types.service';

@Injectable()
export class ElementsImportExportService {
    private readonly ID_PROPERTY: keyof CreateViewElementDto = "id";
    private readonly ABBREVIATION_PROPERTY: keyof CreateViewElementDto = "abbreviation";
    private readonly NAME_PROPERTY: keyof CreateViewElementDto = "name";
    private readonly DESCRIPTION_PROPERTY: keyof CreateViewElementDto = "description";
    private readonly UNITS_PROPERTY: keyof CreateViewElementDto = "units";
    private readonly TYPE_ID_PROPERTY: keyof CreateViewElementDto = "typeId";
    private readonly ENTRY_SCALE_FACTOR_PROPERTY: keyof CreateViewElementDto = "entryScaleFactor";
    private readonly COMMENT_PROPERTY: keyof CreateViewElementDto = "comment";

    constructor(
        private fileIOService: FileIOService,
        private elementsService: ElementsService,
        private elementTypesService: ElementTypesService,
    ) { }

    public async import(file: Express.Multer.File, userId: number) {
        const tmpTableName = `elements_upload_user_${userId}_${new Date().getTime()}`;
        const tmpFilePathName: string = `${this.fileIOService.apiImportsDir}/${tmpTableName}.csv`;
        // Save the file to the temporary directory
        await this.fileIOService.saveFile(file, tmpFilePathName);

        try {

            // Read csv to duckdb and create table.
            await this.fileIOService.duckDbConn.run(`CREATE OR REPLACE TABLE ${tmpTableName} AS SELECT * FROM read_csv('${tmpFilePathName}', header = false, skip = 1, all_varchar = true, delim = ',');`);

            // Make sure there are no empty ids and names
            //await this.validateIdAndNameValues(tmpStationTableName);

            let alterSQLs: string;
            // Rename all columns to use the expected suffix column indices
            alterSQLs = await DuckDBUtils.getRenameDefaultColumnNamesSQL(this.fileIOService.duckDbConn, tmpTableName);

            alterSQLs = alterSQLs + this.getAlterIdColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + this.getAlterAbbreviationColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + this.getAlterNameColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + this.getAlterDescriptionColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + this.getAlterUnitsColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + await this.getAlterElementTypesColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + this.getAlterEntryScaleFactorColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + this.getAlterCommentsColumnSQL(tmpTableName);

            // Execute the duckdb DDL SQL commands
            await this.fileIOService.duckDbConn.run(alterSQLs);

            let duplicates: any[];
            //check for duplicate ids
            duplicates = await DuckDBUtils.getDuplicateCount(this.fileIOService.duckDbConn, tmpTableName, this.ID_PROPERTY);
            if (duplicates.length > 0) throw new Error(`Error: ${JSON.stringify(duplicates)}`);
            //check for abbreviations names
            duplicates = await DuckDBUtils.getDuplicateCount(this.fileIOService.duckDbConn, tmpTableName, this.ABBREVIATION_PROPERTY);
            if (duplicates.length > 0) throw new Error(`Error: ${JSON.stringify(duplicates)}`);
            //check for duplicate names
            duplicates = await DuckDBUtils.getDuplicateCount(this.fileIOService.duckDbConn, tmpTableName, this.NAME_PROPERTY);
            if (duplicates.length > 0) throw new Error(`Error: ${JSON.stringify(duplicates)}`);

            // Get all the data imported
            const reader = await this.fileIOService.duckDbConn.runAndReadAll(`SELECT ${this.ID_PROPERTY}, ${this.ABBREVIATION_PROPERTY}, ${this.NAME_PROPERTY}, ${this.DESCRIPTION_PROPERTY}, ${this.UNITS_PROPERTY}, ${this.TYPE_ID_PROPERTY}, ${this.ENTRY_SCALE_FACTOR_PROPERTY}, ${this.COMMENT_PROPERTY} FROM ${tmpTableName};`);
            const rows = reader.getRowObjects() as any[];

            // Delete the elements table
            this.fileIOService.duckDbConn.run(`DROP TABLE ${tmpTableName};`);

            // Save the elements
            await this.elementsService.bulkPut(rows as CreateViewElementDto[], userId);

        } catch (error) {
            console.error("File Import Failed: ", error)
            throw new BadRequestException("Error: File Import Failed: " + error.message);
        } finally {
            this.fileIOService.deleteFile(tmpFilePathName);
        }
    }


    private getAlterIdColumnSQL(tableName: string): string {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column0 TO ${this.ID_PROPERTY};`;

        // null ids not allowed
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ID_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private getAlterAbbreviationColumnSQL(tableName: string): string {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column1 TO ${this.ABBREVIATION_PROPERTY};`;

        // null names not allowed 
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ABBREVIATION_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private getAlterNameColumnSQL(tableName: string): string {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column2 TO ${this.NAME_PROPERTY};`;

        // null names not allowed 
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.NAME_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private getAlterDescriptionColumnSQL(tableName: string): string {
        return `ALTER TABLE ${tableName} RENAME column3 TO ${this.DESCRIPTION_PROPERTY};`;
    }

    private getAlterUnitsColumnSQL(tableName: string): string {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column4 TO ${this.UNITS_PROPERTY};`;
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.UNITS_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private async getAlterElementTypesColumnSQL(tableName: string): Promise<string> {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column5 TO ${this.TYPE_ID_PROPERTY};`;

        // Convert all contents to lower case
        sql = sql + `UPDATE ${tableName} SET ${this.TYPE_ID_PROPERTY} = lower(${this.TYPE_ID_PROPERTY});`;

        // Get rows that have supported observation environment and nulls only
        const elementTypes = (await this.elementTypesService.find()).map(item => {
            return { sourceId: item.name.toLowerCase(), databaseId: item.id };
        });
        sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.TYPE_ID_PROPERTY, elementTypes, false);

        return sql;
    }

    private getAlterEntryScaleFactorColumnSQL(tableName: string): string {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column6 TO ${this.ENTRY_SCALE_FACTOR_PROPERTY};`
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ENTRY_SCALE_FACTOR_PROPERTY} TYPE DOUBLE;`;
        return sql;
    }

    private getAlterCommentsColumnSQL(tableName: string): string {
        return `ALTER TABLE ${tableName} RENAME column7 TO ${this.COMMENT_PROPERTY};`;
    }

    //------------------------------------
    // EXPORT FUNCTIONAILTY

    public async export(userId: number): Promise<StreamableFile> {
        try {
            const allElements = await this.elementsService.find();
            const allElementTypes = await this.elementTypesService.find();

            const tmpTableName = `elements_download_user_${userId}_${new Date().getTime()}`;
            const createTableAndInserSQLs = this.getCreateTableAndInsertSQL(tmpTableName);

            // Create a DuckDB table for stations
            await this.fileIOService.duckDbConn.run(createTableAndInserSQLs.createTable);

            // Insert the data into DuckDB
            for (const element of allElements) {
                const elementType = allElementTypes.find(item => item.id === element.typeId);

                await this.fileIOService.duckDbConn.run(createTableAndInserSQLs.insert, {
                    1: element.id,
                    2: element.abbreviation,
                    3: element.name,
                    4: element.description !== null ? element.description : '',
                    5: element.units !== null ? element.units : '',
                    6: elementType ? elementType.name.toLowerCase() : '',
                    7: element.entryScaleFactor !== null ? element.entryScaleFactor : '',
                    8: element.comment !== null ? element.comment : '',
                });
            }

            // Export the DuckDB data into a CSV file
            const filePathName: string = `${this.fileIOService.apiExportsDir}/${tmpTableName}.csv`;
            await this.fileIOService.duckDbConn.run(`COPY (SELECT * FROM ${tmpTableName}) TO '${filePathName}' WITH (HEADER, DELIMITER ',');`);

            // Delete the stations table
            this.fileIOService.duckDbConn.run(`DROP TABLE ${tmpTableName};`);

            // Return the generated CSV file
            return this.fileIOService.createStreamableFile(filePathName);
        } catch (error) {
            console.error("Elements Export Failed: ", error);
            throw new BadRequestException("File export Failed");
        }

    }

    private getCreateTableAndInsertSQL(tableName: string): { createTable: string, insert: string } {
        const fields: string[] = [
            'id', 'abbreviation', 'name', 'description', 'units', 'element_type', 'entry_scale_factor', 'comment'
        ];

        const createColumns = fields.map(item => `${item} VARCHAR`).join(', ');
        const insertColumns = fields.join(', ');
        const placeholders = fields.map(() => '?').join(', ');

        const createTableSQL = `  CREATE OR REPLACE TABLE ${tableName} (${createColumns}); `;
        const insertSQL = `INSERT INTO ${tableName} (${insertColumns}) VALUES (${placeholders});`;

        return { createTable: createTableSQL, insert: insertSQL };
    }



}
