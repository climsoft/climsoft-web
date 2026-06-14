import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ViewSourceSpecificationModel } from 'src/metadata/source-specifications/dtos/view-source-specification.model';
import { ImportSourceTabularParamsDto } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { AdapterRunnerService, AdapterRef, AdapterRunMetadata, AdapterRunResult } from 'src/shared/services/adapter-runner.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/create-view-element.dto';
import { SourceTypeEnum } from 'src/metadata/source-specifications/enums/source-type.enum';
import { DataStructureTypeEnum, ImportSourceDto } from 'src/metadata/source-specifications/dtos/import-source.dto';
import { DataSource } from 'typeorm';
import { TabularImportTransformer } from './tabular-import-transformer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DuckDBUtils, getTableNameFromUUID } from 'src/shared/utils/duckdb.utils';
import { FlagsService } from 'src/metadata/flags/services/flags.service';
import { AdaptersService } from 'src/metadata/adapters/services/adapters.service';
import { ViewFlagDto } from 'src/metadata/flags/dtos/view-flag.dto';
import { FileProcessingError } from 'src/metadata/file-processing-error.model';

@Injectable()
export class ObservationImportService {
    private readonly logger: Logger = new Logger(ObservationImportService.name);

    constructor(
        private fileIOService: FileIOService,
        private adapterRunnerService: AdapterRunnerService,
        private dataSource: DataSource,
        private sourcesService: SourceSpecificationsService,
        private adaptersService: AdaptersService,
        private elementsService: ElementsService,
        private flagsService: FlagsService,
        private eventEmitter: EventEmitter2,
    ) { }

    public async processManualImport(sourceId: number, file: Express.Multer.File, userId: number, stationId: string | null) {
        const op = await this.fileIOService.createOperation();
        try {
            const inputFilePathName = path.posix.join(op.inputDir, file.originalname);

            // Save uploaded file to the operation's input directory
            await fs.promises.writeFile(inputFilePathName, file.buffer);

            // Process the import using duckdb
            const result = await this.processFileForImport(sourceId, inputFilePathName, op.intermediateDir, op.outputDir, userId, stationId);

            if (result) {
                throw new BadRequestException(result.message);
            }

            // Import to database from the operation's output directory
            const outputFiles = await fs.promises.readdir(op.outputDir);
            if (outputFiles.length === 0) {
                throw new BadRequestException('No processed file produced');
            }
            const processedFilePathName = path.posix.join(op.dbOutputDir, outputFiles[0]);
            await this.importProcessedFileToDatabase(processedFilePathName);

        } catch (error) {
            const errorMessage: string = error instanceof Error ? error.message : String(error);
            this.logger.error(errorMessage);
            throw new BadRequestException(errorMessage);
        } finally {
            await this.fileIOService.deleteOperation(op.operationId);
        }
    }

    /**
     * Processes a file for import. If the source has an adapter, the adapter
     * writes to `op.intermediateDir` and DuckDB reads from there. Otherwise
     * DuckDB reads directly from `op.inputDir`. The processed CSV is written
     * to `op.outputDir`.
     */
    public async processFileForImport(
        sourceId: number,
        inputFilePathName: string,
        intermediateDir: string,
        outputDir: string,
        userId: number,
        stationId: string | null): Promise<FileProcessingError | void> {
        const sourceDef = this.sourcesService.find(sourceId);

        if (sourceDef.sourceType !== SourceTypeEnum.IMPORT) {
            throw new Error('Source is not an import source');
        }

        if (sourceDef.disabled) {
            throw new Error('Import source is disabled');
        }

        // Determine which directory DuckDB should read from
        // let duckDbInputFilePathName: string = path.posix.join(op.inputDir, inputFileName);
        let duckDbInputFilePathName: string = inputFilePathName;

        if (sourceDef.adapterId) {
            const result: AdapterRunResult = await this.runImportAdapter(sourceDef, inputFilePathName, intermediateDir, userId, stationId);
            if (result.status === 'failure') {
                return result.error;
            }

            duckDbInputFilePathName = path.posix.join(intermediateDir, result.outputFiles[0]);
        }

        const importSourceDef = sourceDef.parameters as ImportSourceDto;

        if (importSourceDef.dataStructureType === DataStructureTypeEnum.TABULAR) {
            return await this.processTabularSource(sourceDef, duckDbInputFilePathName, outputDir, userId, stationId);
        } else {
            throw new Error('Source structure not supported yet');
        }
    }

    /**
     * Runs the pre-import adapter. The adapter reads from `op.inputDir`
     * and writes its output to `op.intermediateDir`.
     */
    private async runImportAdapter(
        sourceDef: ViewSourceSpecificationModel,
        inputFilePathName: string,
        outputDir: string,
        userId: number,
        stationId: string | null,
    ): Promise<AdapterRunResult> {
        const adapter = this.adaptersService.find(sourceDef.adapterId!);

        const adapterRef: AdapterRef = {
            id: adapter.id,
            name: adapter.name,
            language: adapter.language,
            scriptDirName: adapter.scriptDirName,
            entryPoint: adapter.entryPoint,
        };

        const metadata: AdapterRunMetadata = {
            initiatedByUserId: userId,
            initiatedAt: new Date().toISOString(),
            sourceSpecId: sourceDef.id,
            sourceSpecName: sourceDef.name,
            stationId: stationId,
            utcOffset: sourceDef.utcOffset,
            specParameters: sourceDef.parameters as unknown as Record<string, unknown>,
            testRun: false,
        };

        const result: AdapterRunResult = await this.adapterRunnerService.run(
            adapterRef,
            inputFilePathName,
            outputDir,
            metadata);

        return result;
    }

    private async processTabularSource(
        sourceDef: ViewSourceSpecificationModel,
        inputFilePathName: string,
        outputDir: string,
        userId: number,
        stationId: string | null,
    ): Promise<FileProcessingError | void> {
        const startTime = Date.now();

        this.logger.log(`processing file ${inputFilePathName} for database import`);

        const sourceId: number = sourceDef.id;
        const importDef: ImportSourceDto = sourceDef.parameters as ImportSourceDto;
        const tabularDef: ImportSourceTabularParamsDto = importDef.dataStructureParameters as ImportSourceTabularParamsDto;

        const uuid: crypto.UUID = crypto.randomUUID();
        const tableName: string = getTableNameFromUUID(uuid);
        const outputFilePathName: string = path.posix.join(outputDir, `${uuid}.csv`);

        //---------------------------------
        // Step 1
        // Read the file, create table and execute transformations
        await DuckDBUtils.createTableFromFile(this.fileIOService.duckDbConn, inputFilePathName, tableName, false, tabularDef.rowsToSkip, 0, tabularDef.delimiter);

        const elements: CreateViewElementDto[] = this.elementsService.find();
        const flags: ViewFlagDto[] = this.flagsService.find();
        const error: FileProcessingError | void = await TabularImportTransformer.executeTransformation(this.fileIOService.duckDbConn, tableName, sourceId, sourceDef, elements, flags, stationId, userId);

        if (error) {
            this.logger.warn(`Errors found during data transformation for file ${inputFilePathName}`);
            return error;
        }

        //---------------------------------
        // Step 2
        // Write the transformed table to a file and drop the table
        await TabularImportTransformer.exportTransformedDataToFile(this.fileIOService.duckDbConn, tableName, outputFilePathName);
        await this.fileIOService.duckDbConn.run(`DROP TABLE ${tableName};`);

        this.logger.log(`DuckDB processing took ${Date.now() - startTime} milliseconds`);
    }

    /**
     * Import processed CSV file to database using PostgreSQL COPY command.
     * Uses a staging table approach to handle duplicates efficiently.
     */
    public async importProcessedFileToDatabase(inputFilePathName: string,): Promise<void> {
        const startTime = Date.now();

        this.logger.log(`Importing file ${inputFilePathName} into database`);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {

            const tableName: string = getTableNameFromUUID(crypto.randomUUID());

            const createStagingTableQuery = `
                    CREATE TEMP TABLE ${tableName} (
                        ${TabularImportTransformer.STATION_ID_PROPERTY_NAME} VARCHAR NOT NULL,
                        ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME} INTEGER NOT NULL,
                        ${TabularImportTransformer.LEVEL_PROPERTY_NAME} INTEGER NOT NULL,
                        ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME} TIMESTAMPTZ NOT NULL,
                        ${TabularImportTransformer.INTERVAL_PROPERTY_NAME} INTEGER NOT NULL,
                        ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME} INTEGER NOT NULL,
                        ${TabularImportTransformer.VALUE_PROPERTY_NAME} DOUBLE PRECISION,
                        ${TabularImportTransformer.FLAG_PROPERTY_NAME} INTEGER,
                        ${TabularImportTransformer.COMMENT_PROPERTY_NAME} VARCHAR,
                        ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME} INTEGER NOT NULL
                    ) ON COMMIT DROP;
                `;

            await queryRunner.query(createStagingTableQuery);

            const copyQuery = `
                    COPY ${tableName} (${TabularImportTransformer.STATION_ID_PROPERTY_NAME}, ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME}, ${TabularImportTransformer.LEVEL_PROPERTY_NAME}, ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME}, ${TabularImportTransformer.INTERVAL_PROPERTY_NAME}, ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME}, ${TabularImportTransformer.VALUE_PROPERTY_NAME}, ${TabularImportTransformer.FLAG_PROPERTY_NAME}, ${TabularImportTransformer.COMMENT_PROPERTY_NAME}, ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME})
                    FROM '${inputFilePathName}'
                    WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');
                `;

            await queryRunner.query(copyQuery);

            const upsertQuery = `
                    INSERT INTO observations (${TabularImportTransformer.STATION_ID_PROPERTY_NAME}, ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME}, ${TabularImportTransformer.LEVEL_PROPERTY_NAME}, ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME}, ${TabularImportTransformer.INTERVAL_PROPERTY_NAME}, ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME}, ${TabularImportTransformer.VALUE_PROPERTY_NAME}, ${TabularImportTransformer.FLAG_PROPERTY_NAME}, ${TabularImportTransformer.COMMENT_PROPERTY_NAME}, ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME})
                    SELECT ${TabularImportTransformer.STATION_ID_PROPERTY_NAME}, ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME}, ${TabularImportTransformer.LEVEL_PROPERTY_NAME}, ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME}, ${TabularImportTransformer.INTERVAL_PROPERTY_NAME}, ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME}, ${TabularImportTransformer.VALUE_PROPERTY_NAME}, ${TabularImportTransformer.FLAG_PROPERTY_NAME}, ${TabularImportTransformer.COMMENT_PROPERTY_NAME}, ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME}
                    FROM ${tableName}
                    ON CONFLICT (${TabularImportTransformer.STATION_ID_PROPERTY_NAME}, ${TabularImportTransformer.ELEMENT_ID_PROPERTY_NAME}, ${TabularImportTransformer.LEVEL_PROPERTY_NAME}, ${TabularImportTransformer.DATE_TIME_PROPERTY_NAME}, ${TabularImportTransformer.INTERVAL_PROPERTY_NAME}, ${TabularImportTransformer.SOURCE_ID_PROPERTY_NAME})
                    DO UPDATE SET
                        ${TabularImportTransformer.VALUE_PROPERTY_NAME} = EXCLUDED.${TabularImportTransformer.VALUE_PROPERTY_NAME},
                        ${TabularImportTransformer.FLAG_PROPERTY_NAME} = EXCLUDED.${TabularImportTransformer.FLAG_PROPERTY_NAME},
                        ${TabularImportTransformer.COMMENT_PROPERTY_NAME} = EXCLUDED.${TabularImportTransformer.COMMENT_PROPERTY_NAME},
                        ${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME} = EXCLUDED.${TabularImportTransformer.ENTRY_USER_ID_PROPERTY_NAME};
                `;

            await queryRunner.query(upsertQuery);

            await queryRunner.commitTransaction();

            this.logger.log(`Successfully imported ${inputFilePathName} into database`);

            this.eventEmitter.emit('observations.saved');

        } catch (error) {
            await queryRunner.rollbackTransaction();

            let errorMessage: string = error instanceof Error ? error.message : String(error);
            errorMessage = `Database import failed for ${inputFilePathName}: ${errorMessage}`;
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            await queryRunner.release();
        }

        this.logger.log(`PostgreSQL import took ${Date.now() - startTime} milliseconds`);
    }
}
