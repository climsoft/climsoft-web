import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ElementImportTransformer } from './element-import-transformer';
import { ElementsService } from './elements.service';
import path from 'node:path';
import crypto from 'node:crypto';
import { DataSource } from 'typeorm';
import { getUniqueTableName } from 'src/shared/utils/duckdb.utils';

@Injectable()
export class ElementsImportExportService {
    private readonly logger: Logger = new Logger(ElementsImportExportService.name);

    constructor(
        private fileIOService: FileIOService,
        private dataSource: DataSource,
        private elementsService: ElementsService,
    ) { }

    /**
     * Import processed CSV file to database using PostgreSQL COPY command.
     * Uses a staging table approach to handle duplicates efficiently.
     * The file is expected to contain columns matching ElementImportTransformer.ALL_COLUMNS.
     */
    public async importProcessedFileToDatabase(dbIputFilePathName: string): Promise<void> {
        const startTime = Date.now();
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            this.logger.log(`Importing elements file ${dbIputFilePathName} into database`);

            const stagingTableName: string = getUniqueTableName();

            // Step 1: Create temporary staging table (no constraints for fast COPY)
            const createStagingTableQuery = `
                CREATE TEMP TABLE ${stagingTableName} (
                    ${ElementImportTransformer.ID_PROPERTY} INTEGER NOT NULL,
                    ${ElementImportTransformer.ABBREVIATION_PROPERTY} VARCHAR NOT NULL,
                    ${ElementImportTransformer.NAME_PROPERTY} VARCHAR NOT NULL,
                    ${ElementImportTransformer.DESCRIPTION_PROPERTY} VARCHAR,
                    ${ElementImportTransformer.UNITS_PROPERTY} VARCHAR,
                    ${ElementImportTransformer.TYPE_ID_PROPERTY} INTEGER,
                    ${ElementImportTransformer.ENTRY_SCALE_FACTOR_PROPERTY} INTEGER,
                    ${ElementImportTransformer.COMMENT_PROPERTY} VARCHAR,
                    ${ElementImportTransformer.ENTRY_USER_ID_PROPERTY} INTEGER NOT NULL
                ) ON COMMIT DROP;
            `;

            await queryRunner.query(createStagingTableQuery);

            // Step 2: COPY data into staging table
            const allColumns = ElementImportTransformer.ALL_COLUMNS.join(', ');
            const copyQuery = `
                COPY ${stagingTableName} (${allColumns})
                FROM '${dbIputFilePathName}'
                WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');
            `;

            await queryRunner.query(copyQuery);

            // Step 3: Insert from staging to elements with ON CONFLICT handling
            const upsertQuery = `
                INSERT INTO elements (
                    ${ElementImportTransformer.ID_PROPERTY},
                    ${ElementImportTransformer.ABBREVIATION_PROPERTY},
                    ${ElementImportTransformer.NAME_PROPERTY},
                    ${ElementImportTransformer.DESCRIPTION_PROPERTY},
                    ${ElementImportTransformer.UNITS_PROPERTY},
                    ${ElementImportTransformer.TYPE_ID_PROPERTY},
                    ${ElementImportTransformer.ENTRY_SCALE_FACTOR_PROPERTY},
                    ${ElementImportTransformer.COMMENT_PROPERTY},
                    ${ElementImportTransformer.ENTRY_USER_ID_PROPERTY}
                )
                SELECT
                    ${ElementImportTransformer.ID_PROPERTY},
                    ${ElementImportTransformer.ABBREVIATION_PROPERTY},
                    ${ElementImportTransformer.NAME_PROPERTY},
                    ${ElementImportTransformer.DESCRIPTION_PROPERTY},
                    ${ElementImportTransformer.UNITS_PROPERTY},
                    ${ElementImportTransformer.TYPE_ID_PROPERTY},
                    ${ElementImportTransformer.ENTRY_SCALE_FACTOR_PROPERTY},
                    ${ElementImportTransformer.COMMENT_PROPERTY},
                    ${ElementImportTransformer.ENTRY_USER_ID_PROPERTY}
                FROM ${stagingTableName}
                ON CONFLICT (${ElementImportTransformer.ID_PROPERTY})
                DO UPDATE SET
                    ${ElementImportTransformer.ABBREVIATION_PROPERTY} = EXCLUDED.${ElementImportTransformer.ABBREVIATION_PROPERTY},
                    ${ElementImportTransformer.NAME_PROPERTY} = EXCLUDED.${ElementImportTransformer.NAME_PROPERTY},
                    ${ElementImportTransformer.DESCRIPTION_PROPERTY} = EXCLUDED.${ElementImportTransformer.DESCRIPTION_PROPERTY},
                    ${ElementImportTransformer.UNITS_PROPERTY} = EXCLUDED.${ElementImportTransformer.UNITS_PROPERTY},
                    ${ElementImportTransformer.TYPE_ID_PROPERTY} = EXCLUDED.${ElementImportTransformer.TYPE_ID_PROPERTY},
                    ${ElementImportTransformer.ENTRY_SCALE_FACTOR_PROPERTY} = EXCLUDED.${ElementImportTransformer.ENTRY_SCALE_FACTOR_PROPERTY},
                    ${ElementImportTransformer.COMMENT_PROPERTY} = EXCLUDED.${ElementImportTransformer.COMMENT_PROPERTY},
                    ${ElementImportTransformer.ENTRY_USER_ID_PROPERTY} = EXCLUDED.${ElementImportTransformer.ENTRY_USER_ID_PROPERTY};
            `;

            await queryRunner.query(upsertQuery);

            // Step 4: Commit transaction - staging table is automatically dropped (ON COMMIT DROP)
            await queryRunner.commitTransaction();
            await this.elementsService.invalidateCache();

            this.logger.log(`Successfully imported ${dbIputFilePathName} into database. Time taken ${Date.now() - startTime} milliseconds`);

        } catch (error) {
            await queryRunner.rollbackTransaction();

            let errorMessage = error instanceof Error ? error.message : String(error);
            errorMessage = `Database import failed for ${dbIputFilePathName}: ${errorMessage}`;
            this.logger.error(errorMessage);
            throw new BadRequestException(errorMessage);
        } finally {
            await queryRunner.release();
        }

        this.logger.log(`PostgreSQL import took ${Date.now() - startTime} milliseconds`);
    }

    //------------------------------------
    // EXPORT FUNCTIONAILTY

    public async export(): Promise<string> {
        const op = await this.fileIOService.createOperation();
        const uuid: crypto.UUID = crypto.randomUUID();
        const dbFilePathName = path.posix.join(op.dbOutputDir, `${uuid}.csv`);
        const apiFilePathName = path.posix.join(op.outputDir, `${uuid}.csv`);

        try {
            await this.dataSource.query(`
                COPY (
                    SELECT
                        el.id,
                        el.abbreviation,
                        el.name,
                        el.description,
                        el.units,
                        LOWER(et.name) AS element_type,
                        el.entry_scale_factor,
                        el.comment
                    FROM elements el
                    LEFT JOIN element_types et ON el.type_id = et.id
                    ORDER BY el.id ASC
                ) TO '${dbFilePathName}' WITH (FORMAT csv, HEADER true, DELIMITER ',');
            `);

            return apiFilePathName;
        } catch (error) {
            await this.fileIOService.deleteOperation(op.operationId);
            this.logger.error(error);
            throw new BadRequestException('File export Failed');
        }
    }

}
