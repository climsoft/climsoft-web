import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ElementsService } from './elements.service';
import { ElementTypesService } from './element-types.service';

@Injectable()
export class ElementsImportExportService {

    constructor(
        private fileIOService: FileIOService,
        private elementsService: ElementsService,
        private elementTypesService: ElementTypesService,
    ) { }

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
