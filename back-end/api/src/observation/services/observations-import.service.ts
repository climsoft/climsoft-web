import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ViewSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/view-source-specification.dto';
import { ImportSourceTabularParamsDto } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { DataStructureTypeEnum, ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { DataSource } from 'typeorm';
import { TabularImportTransformer } from './tabular-import-transformer';
import { PreviewError } from '../dtos/import-preview.dto';

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

            // Save file from memory
            await fs.promises.writeFile(importFilePathName, file.buffer);

            // Process the import using duckdb
            const processedFilePathName = await this.processFileForImport(sourceId, importFilePathName, userId, stationId);

            // Import to database
            await this.importProcessedFileToDatabase(processedFilePathName);

            try {
                // Delete created files
                fs.promises.unlink(importFilePathName);
                fs.promises.unlink(processedFilePathName);
            } catch (error) {
                this.logger.error(`Failed to delete uploaded file ${importFilePathName} and processed file ${processedFilePathName}: ${error instanceof Error ? error.message : String(error)}`);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(errorMessage);
            throw new BadRequestException(errorMessage);
        }
    }

    public async processFileForImport(sourceId: number, importFilePathName: string, userId: number, stationId?: string): Promise<string> {
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
            return this.processTabularSource(sourceDef, importFilePathName, userId, stationId);
        } else {
            throw new Error('Source structure not supported yet');
        }
    }

    private async processTabularSource(sourceDef: ViewSourceSpecificationDto, inputFilePathName: string, userId: number, stationId?: string): Promise<string> {
        const startTime: number = Date.now();

        const sourceId: number = sourceDef.id;
        const importDef: ImportSourceDto = sourceDef.parameters as ImportSourceDto;
        const tabularDef: ImportSourceTabularParamsDto = importDef.dataStructureParameters as ImportSourceTabularParamsDto;

        // Execute the duckdb DDL SQL commands
        const tableName: string = await TabularImportTransformer.loadTableFromFile(this.fileIOService.duckDbConn, inputFilePathName, tabularDef.rowsToSkip, 0, tabularDef.delimiter);

        // TODO. Will come from cache in later iterations
        const elements: CreateViewElementDto[] = await this.elementsService.find();

        // This transformation step is where all the data mapping and validation logic happens, implemented in ImportSqlBuilder
        const errors: PreviewError | void = await TabularImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, sourceId, sourceDef, elements, userId, stationId);

        // TODO. throw errors if any.
        if (errors) {
            this.logger.error(`Errors found during data transformation for file ${path.basename(inputFilePathName)}: ${JSON.stringify(errors)}`);
            throw new Error(`Data transformation failed with ${errors} error(s). Check logs for details.`);
        }

        // Note, duckdb operate at the API layer, so use apiImportsDir path
        const timestamp = Date.now();
        const exportFilePathName = path.posix.join(this.fileIOService.apiImportsDir, `import_processed_${path.basename(inputFilePathName, path.extname(inputFilePathName))}_${timestamp}.csv`);

        await TabularImportTransformer.exportTransformedDataToFile(this.fileIOService.duckDbConn, tableName, exportFilePathName);

        await this.fileIOService.duckDbConn.run(`DROP TABLE ${tableName};`);

        this.logger.log(`DuckDB processing took ${Date.now() - startTime} milliseconds`);

        return exportFilePathName;

    }

    /**
     * Import processed CSV file to database using PostgreSQL COPY command
     * Uses a staging table approach to handle duplicates efficiently
     */
    public async importProcessedFileToDatabase(filePathName: string): Promise<void> {
        let startTime = Date.now();
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
                        ${TabularImportTransformer.STATION_ID_PROPERTY_NAME} VARCHAR NOT NULL,
                        ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME} INTEGER NOT NULL,
                        ${TabularImportTransformer.LEVEL_PROPERTY_NAME} INTEGER NOT NULL,
                        ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME} TIMESTAMPTZ NOT NULL,
                        ${TabularImportTransformer.INTERVAL_PROPERTY_NAME} INTEGER NOT NULL,
                        ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME} INTEGER NOT NULL,
                        ${TabularImportTransformer.VALUE_PROPERTY_NAME} DOUBLE PRECISION,
                        ${TabularImportTransformer.FLAG_PROPERTY_NAME} VARCHAR,
                        ${TabularImportTransformer.COMMENT_PROPERTY_NAME} VARCHAR,
                        ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME} INTEGER NOT NULL
                    ) ON COMMIT DROP;
                `;

            await queryRunner.query(createStagingTableQuery);

            // Step 2: COPY data into staging table (very fast, no constraints)
            const copyQuery = `
                    COPY ${stagingTableName} (${TabularImportTransformer.STATION_ID_PROPERTY_NAME}, ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME}, ${TabularImportTransformer.LEVEL_PROPERTY_NAME}, ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME}, ${TabularImportTransformer.INTERVAL_PROPERTY_NAME}, ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME}, ${TabularImportTransformer.VALUE_PROPERTY_NAME}, ${TabularImportTransformer.FLAG_PROPERTY_NAME}, ${TabularImportTransformer.COMMENT_PROPERTY_NAME}, ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME})
                    FROM '${dbFilePathName}'
                    WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');
                `;

            await queryRunner.query(copyQuery);

            // Step 3: Insert from staging to observations with ON CONFLICT handling
            // If duplicate exists, update the existing record with new values
            // Cast flag from VARCHAR to observations_flag_enum type
            const upsertQuery = `
                    INSERT INTO observations (${TabularImportTransformer.STATION_ID_PROPERTY_NAME}, ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME}, ${TabularImportTransformer.LEVEL_PROPERTY_NAME}, ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME}, ${TabularImportTransformer.INTERVAL_PROPERTY_NAME}, ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME}, ${TabularImportTransformer.VALUE_PROPERTY_NAME}, ${TabularImportTransformer.FLAG_PROPERTY_NAME}, ${TabularImportTransformer.COMMENT_PROPERTY_NAME}, ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME})
                    SELECT ${TabularImportTransformer.STATION_ID_PROPERTY_NAME}, ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME}, ${TabularImportTransformer.LEVEL_PROPERTY_NAME}, ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME}, ${TabularImportTransformer.INTERVAL_PROPERTY_NAME}, ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME}, ${TabularImportTransformer.VALUE_PROPERTY_NAME}, ${TabularImportTransformer.FLAG_PROPERTY_NAME}::observations_flag_enum, ${TabularImportTransformer.COMMENT_PROPERTY_NAME}, ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME}
                    FROM ${stagingTableName}
                    ON CONFLICT (${TabularImportTransformer.STATION_ID_PROPERTY_NAME}, ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME}, ${TabularImportTransformer.LEVEL_PROPERTY_NAME}, ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME}, ${TabularImportTransformer.INTERVAL_PROPERTY_NAME}, ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME})
                    DO UPDATE SET
                        ${TabularImportTransformer.VALUE_PROPERTY_NAME} = EXCLUDED.${TabularImportTransformer.VALUE_PROPERTY_NAME},
                        ${TabularImportTransformer.FLAG_PROPERTY_NAME} = EXCLUDED.${TabularImportTransformer.FLAG_PROPERTY_NAME},
                        ${TabularImportTransformer.COMMENT_PROPERTY_NAME} = EXCLUDED.${TabularImportTransformer.COMMENT_PROPERTY_NAME},
                        ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME} = EXCLUDED.${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME};
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

        this.logger.log(`PostgreSQL import took ${Date.now() - startTime} milliseconds`);
    }
}
