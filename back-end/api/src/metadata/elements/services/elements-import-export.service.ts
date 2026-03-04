import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FileIOService } from 'src/shared/services/file-io.service';
import { ElementImportTransformer } from './element-import-transformer';
import { ElementsService } from './elements.service';
import * as path from 'node:path';
import { DataSource } from 'typeorm';

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
    public async importProcessedFileToDatabase(filePathName: string): Promise<void> {
        const startTime = Date.now();
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            this.logger.log(`Importing file ${path.basename(filePathName)} into database`);
            const dbFilePathName: string = path.posix.join(this.fileIOService.dbImportsDir, path.basename(filePathName));

            const stagingTableName = `elem_staging_${Date.now()}`;

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
                FROM '${dbFilePathName}'
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

            this.logger.log(`Successfully imported ${path.basename(filePathName)} into database`);

        } catch (error) {
            await queryRunner.rollbackTransaction();

            let errorMessage = error instanceof Error ? error.message : String(error);
            errorMessage = `Database import failed for ${path.basename(filePathName)}: ${errorMessage}`;
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            await queryRunner.release();
        }

        this.logger.log(`PostgreSQL import took ${Date.now() - startTime} milliseconds`);
    }

    //------------------------------------
    // EXPORT FUNCTIONAILTY

    public async export(userId: number): Promise<string> {
        const tmpTableName = `elements_download_user_${userId}_${Date.now()}`;
        const dbFilePathName = path.posix.join(this.fileIOService.dbExportsDir, `${tmpTableName}.csv`);
        const apiFilePathName = path.posix.join(this.fileIOService.apiExportsDir, `${tmpTableName}.csv`);

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
            this.logger.error('Elements Export Failed: ', error);
            throw new BadRequestException('File export Failed');
        }
    }

}
