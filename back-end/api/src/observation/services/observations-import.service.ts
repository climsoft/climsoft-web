import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ViewSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/view-source-specification.dto';
import { ImportSourceTabularParamsDto } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { DataStructureTypeEnum, ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { DataSource } from 'typeorm';
import { ImportSqlBuilder } from './import-sql-builder';

@Injectable()
export class ObservationImportService {
    private readonly logger: Logger = new Logger(ObservationImportService.name);

    constructor(
        private fileIOService: FileIOService,
        private dataSource: DataSource,
        private sourcesService: SourceSpecificationsService,
        private elementsService: ElementsService,
    ) { }

    public async processManualImport(sourceId: number, file: Express.Multer.File, userId: number, stationId?: string) {
        try {
            const importFilePathName: string = path.posix.join(this.fileIOService.apiImportsDir, `user_${userId}_obs_upload_${new Date().getTime()}${path.extname(file.originalname)}`);
            const exportFilePathName: string = path.posix.join(this.fileIOService.apiImportsDir, `user_${userId}_obs_${new Date().getTime()}_processed.csv`);

            // Save file from memory
            await fs.promises.writeFile(importFilePathName, file.buffer);

            // Process the import using duckdb
            await this.processFileForImport(sourceId, importFilePathName, exportFilePathName, userId, stationId);

            // Import to database
            await this.importProcessedFilesToDatabase(exportFilePathName);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(errorMessage);
            throw new BadRequestException(errorMessage);
        }
    }

    public async processFileForImport(sourceId: number, importFilePathName: string, exportFilePathName: string, userId: number, stationId?: string) {
        // Get the source definition using the source id
        const sourceDef = await this.sourcesService.find(sourceId);

        if (sourceDef.sourceType !== SourceTypeEnum.IMPORT) {
            throw new Error('Source is not an import source');
        }

        if (sourceDef.disabled) {
            throw new Error('Import source is disabled');
        }

        const importSourceDef = sourceDef.parameters as ImportSourceDto;

        if (importSourceDef.dataStructureType === DataStructureTypeEnum.TABULAR) {
            await this.processTabularSource(sourceDef, importFilePathName, exportFilePathName, userId, stationId);
        } else {
            throw new Error('Source structure not supported yet');
        }
    }

    /**
     * Import processed CSV files to database using PostgreSQL COPY command
     * Uses a staging table approach to handle duplicates efficiently
     */
    public async importProcessedFilesToDatabase(filePathName: string): Promise<void> {

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            this.logger.log(`Importing file ${path.basename(filePathName)} into database`);
            const dbFilePathName: string = path.posix.join(this.fileIOService.dbImportsDir, path.basename(filePathName));

            // Generate a unique staging table name using timestamp
            const stagingTableName = `obs_staging_${Date.now()}`;

            // Step 1: Create temporary staging table (no constraints for fast COPY)
            // Column types match the observations table schema
            const createStagingTableQuery = `
                    CREATE TEMP TABLE ${stagingTableName} (
                        ${ImportSqlBuilder.STATION_ID_PROPERTY_NAME} VARCHAR NOT NULL,
                        ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME} INTEGER NOT NULL,
                        ${ImportSqlBuilder.LEVEL_PROPERTY_NAME} INTEGER NOT NULL,
                        ${ImportSqlBuilder.DATE_TIME_PROPERTY_NAME} TIMESTAMPTZ NOT NULL,
                        ${ImportSqlBuilder.INTERVAL_PROPERTY_NAME} INTEGER NOT NULL,
                        ${ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME} INTEGER NOT NULL,
                        ${ImportSqlBuilder.VALUE_PROPERTY_NAME} DOUBLE PRECISION,
                        ${ImportSqlBuilder.FLAG_PROPERTY_NAME} VARCHAR,
                        ${ImportSqlBuilder.COMMENT_PROPERTY_NAME} VARCHAR,
                        ${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME} INTEGER NOT NULL
                    ) ON COMMIT DROP;
                `;

            await queryRunner.query(createStagingTableQuery);

            // Step 2: COPY data into staging table (very fast, no constraints)
            const copyQuery = `
                    COPY ${stagingTableName} (${ImportSqlBuilder.STATION_ID_PROPERTY_NAME}, ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME}, ${ImportSqlBuilder.LEVEL_PROPERTY_NAME}, ${ImportSqlBuilder.DATE_TIME_PROPERTY_NAME}, ${ImportSqlBuilder.INTERVAL_PROPERTY_NAME}, ${ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME}, ${ImportSqlBuilder.VALUE_PROPERTY_NAME}, ${ImportSqlBuilder.FLAG_PROPERTY_NAME}, ${ImportSqlBuilder.COMMENT_PROPERTY_NAME}, ${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME})
                    FROM '${dbFilePathName}'
                    WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');
                `;

            await queryRunner.query(copyQuery);

            // Step 3: Insert from staging to observations with ON CONFLICT handling
            // If duplicate exists, update the existing record with new values
            // Cast flag from VARCHAR to observations_flag_enum type
            const upsertQuery = `
                    INSERT INTO observations (${ImportSqlBuilder.STATION_ID_PROPERTY_NAME}, ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME}, ${ImportSqlBuilder.LEVEL_PROPERTY_NAME}, ${ImportSqlBuilder.DATE_TIME_PROPERTY_NAME}, ${ImportSqlBuilder.INTERVAL_PROPERTY_NAME}, ${ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME}, ${ImportSqlBuilder.VALUE_PROPERTY_NAME}, ${ImportSqlBuilder.FLAG_PROPERTY_NAME}, ${ImportSqlBuilder.COMMENT_PROPERTY_NAME}, ${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME})
                    SELECT ${ImportSqlBuilder.STATION_ID_PROPERTY_NAME}, ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME}, ${ImportSqlBuilder.LEVEL_PROPERTY_NAME}, ${ImportSqlBuilder.DATE_TIME_PROPERTY_NAME}, ${ImportSqlBuilder.INTERVAL_PROPERTY_NAME}, ${ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME}, ${ImportSqlBuilder.VALUE_PROPERTY_NAME}, ${ImportSqlBuilder.FLAG_PROPERTY_NAME}::observations_flag_enum, ${ImportSqlBuilder.COMMENT_PROPERTY_NAME}, ${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME}
                    FROM ${stagingTableName}
                    ON CONFLICT (${ImportSqlBuilder.STATION_ID_PROPERTY_NAME}, ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME}, ${ImportSqlBuilder.LEVEL_PROPERTY_NAME}, ${ImportSqlBuilder.DATE_TIME_PROPERTY_NAME}, ${ImportSqlBuilder.INTERVAL_PROPERTY_NAME}, ${ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME})
                    DO UPDATE SET
                        ${ImportSqlBuilder.VALUE_PROPERTY_NAME} = EXCLUDED.${ImportSqlBuilder.VALUE_PROPERTY_NAME},
                        ${ImportSqlBuilder.FLAG_PROPERTY_NAME} = EXCLUDED.${ImportSqlBuilder.FLAG_PROPERTY_NAME},
                        ${ImportSqlBuilder.COMMENT_PROPERTY_NAME} = EXCLUDED.${ImportSqlBuilder.COMMENT_PROPERTY_NAME},
                        ${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME} = EXCLUDED.${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME};
                `;

            await queryRunner.query(upsertQuery);

            // Step 4: Commit transaction - staging table is automatically dropped (ON COMMIT DROP)
            await queryRunner.commitTransaction();

            this.logger.log(`Successfully imported ${filePathName} into database`);

        } catch (error) {
            // Rollback transaction on error
            await queryRunner.rollbackTransaction();

            let errorMessage = error instanceof Error ? error.message : String(error);
            errorMessage = `Database import failed for ${path.basename(filePathName)}: ${errorMessage}`;
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            // Release the query runner
            await queryRunner.release();
        }

    }


    private async processTabularSource(sourceDef: ViewSourceSpecificationDto, inputFilePathName: string, outputFileName: string, userId: number, stationId?: string): Promise<void> {
        const sourceId: number = sourceDef.id;
        const importDef: ImportSourceDto = sourceDef.parameters as ImportSourceDto;
        const tabularDef: ImportSourceTabularParamsDto = importDef.dataStructureParameters as ImportSourceTabularParamsDto;

        // Remove spaces and special characters from table name to ensure valid SQL identifier
        const tmpObsTableName: string = path.basename(inputFilePathName, path.extname(inputFilePathName)).replace(/\s+/g, '_');
        const importParams = ImportSqlBuilder.buildCsvImportParams(tabularDef.rowsToSkip, tabularDef.delimiter);

        // Read csv to duckdb for processing. Important to execute this first before altering the columns due to the renaming of the default column names
        const createSQL: string = `CREATE OR REPLACE TABLE ${tmpObsTableName} AS SELECT * FROM read_csv('${inputFilePathName}', ${importParams.join(', ')});`;

        //console.log("createSQL: ", createSQL);

        await this.fileIOService.duckDb.run(createSQL);

        let alterSQLs: string;
        // Rename all columns to use the expected suffix column indices
        alterSQLs = await DuckDBUtils.getRenameDefaultColumnNamesSQL(this.fileIOService.duckDb, tmpObsTableName);

        // Add the rest of the columns
        alterSQLs = alterSQLs + ImportSqlBuilder.buildAlterStationColumnSQL(tabularDef, tmpObsTableName, stationId);
        alterSQLs = alterSQLs + ImportSqlBuilder.buildAlterElementColumnSQL(tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + ImportSqlBuilder.buildAlterDateTimeColumnSQL(sourceDef, tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + ImportSqlBuilder.buildAlterValueColumnSQL(sourceDef, importDef, tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + ImportSqlBuilder.buildAlterLevelColumnSQL(tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + ImportSqlBuilder.buildAlterIntervalColumnSQL(tabularDef, tmpObsTableName);
        alterSQLs = alterSQLs + ImportSqlBuilder.buildAlterCommentColumnSQL(tabularDef, tmpObsTableName);


        // Add source and user column
        alterSQLs = alterSQLs + `ALTER TABLE ${tmpObsTableName} ADD COLUMN ${ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME} INTEGER DEFAULT ${sourceId};`;
        alterSQLs = alterSQLs + `ALTER TABLE ${tmpObsTableName} ADD COLUMN ${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME} INTEGER DEFAULT ${userId};`;

        // Remove duplicate values based on composite primary key (station_id, element_id, level, date_time, interval, source_id)
        // Keep the last occurrence of each duplicate
        alterSQLs = alterSQLs + ImportSqlBuilder.buildRemoveDuplicatesSQL(tmpObsTableName);

        //console.log("alterSQLs: ", alterSQLs);

        // Execute the duckdb DDL SQL commands
        let startTime = new Date().getTime();
        await this.fileIOService.duckDb.exec(alterSQLs);
        this.logger.log(`DuckDB alters took ${new Date().getTime() - startTime} milliseconds`);

        if (sourceDef.scaleValues) {
            startTime = new Date().getTime();
            // Scale values if indicated, execute the scale values SQL
            await this.fileIOService.duckDb.exec(await this.getScaleValueSQL(tmpObsTableName));
            this.logger.log(`DuckDB scaling took ${new Date().getTime() - startTime} milliseconds`);
        }

        // Get the rows of the columns that match the dto properties
        // Only export the columns needed for PostgreSQL COPY import (exclude entry_datetime as it's auto-generated)
        startTime = new Date().getTime();
        // Note, duckdb operate at the API layer, so use apiImportsDir path
        const dbFilePathName: string = path.posix.join(this.fileIOService.apiImportsDir, path.basename(outputFileName));
        this.logger.log(`Attempting DuckDB writing of table ${tmpObsTableName};`);
        await this.fileIOService.duckDb.exec(`
            COPY (
                SELECT ${ImportSqlBuilder.STATION_ID_PROPERTY_NAME}, ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME}, ${ImportSqlBuilder.LEVEL_PROPERTY_NAME}, ${ImportSqlBuilder.DATE_TIME_PROPERTY_NAME},
                       ${ImportSqlBuilder.INTERVAL_PROPERTY_NAME}, ${ImportSqlBuilder.SOURCE_ID_PROPERTY_NAME}, ${ImportSqlBuilder.VALUE_PROPERTY_NAME},
                       ${ImportSqlBuilder.FLAG_PROPERTY_NAME}, ${ImportSqlBuilder.COMMENT_PROPERTY_NAME}, ${ImportSqlBuilder.ENTRY_USER_ID_PROPERTY_NAME}
                FROM ${tmpObsTableName}
            ) TO '${dbFilePathName}' (HEADER, DELIMITER ',');
        `);
        this.logger.log(`DuckDB writing table took: ${new Date().getTime() - startTime} milliseconds`);

        startTime = new Date().getTime();
        await this.fileIOService.duckDb.run(`DROP TABLE ${tmpObsTableName};`);
        this.logger.log(`DuckDB drop table took ${new Date().getTime() - startTime} milliseconds`);

    }

    private async getScaleValueSQL(tableName: string): Promise<string> {
        const elementIdsToScale: number[] = (await this.fileIOService.duckDb.all(`SELECT DISTINCT ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME} FROM ${tableName};`)).map(item => (item[ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME]));
        const elements: CreateViewElementDto[] = await this.elementsService.find({ elementIds: elementIdsToScale });
        let scalingSQLs: string = '';
        for (const element of elements) {
            // Only scale elements that have a scaling factor > 0
            if (element.entryScaleFactor) {
                scalingSQLs = scalingSQLs + `UPDATE ${tableName} SET ${ImportSqlBuilder.VALUE_PROPERTY_NAME} = (${ImportSqlBuilder.VALUE_PROPERTY_NAME} / ${element.entryScaleFactor}) WHERE ${ImportSqlBuilder.ELEMENT_ID_PROPERTY_NAME} = ${element.id} AND ${ImportSqlBuilder.VALUE_PROPERTY_NAME} IS NOT NULL;`;
            }
        }
        return scalingSQLs;
    }

}
