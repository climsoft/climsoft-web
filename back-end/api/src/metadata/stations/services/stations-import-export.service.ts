import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FileIOService } from 'src/shared/services/file-io.service';
import { StationImportTransformer } from './station-import-transformer';
import { StationsService } from './stations.service';
import * as path from 'node:path';
import { DataSource } from 'typeorm';

@Injectable()
export class StationsImportExportService {
    private readonly logger: Logger = new Logger(StationsImportExportService.name);

    constructor(
        private fileIOService: FileIOService,
        private dataSource: DataSource,
        private stationsService: StationsService,
    ) { }

    /**
     * Import processed CSV file to database using PostgreSQL COPY command.
     * Uses a staging table approach to handle duplicates efficiently.
     * The file is expected to contain columns matching StationImportTransformer.ALL_COLUMNS.
     */
    public async importProcessedFileToDatabase(filePathName: string): Promise<void> {
        const startTime = Date.now();
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            this.logger.log(`Importing file ${path.basename(filePathName)} into database`);
            const dbFilePathName: string = path.posix.join(this.fileIOService.dbImportsDir, path.basename(filePathName));

            const stagingTableName = `stn_staging_${Date.now()}`;

            // Step 1: Create temporary staging table (no constraints for fast COPY)
            const createStagingTableQuery = `
                CREATE TEMP TABLE ${stagingTableName} (
                    ${StationImportTransformer.ID_PROPERTY} VARCHAR NOT NULL,
                    ${StationImportTransformer.NAME_PROPERTY} VARCHAR NOT NULL,
                    ${StationImportTransformer.DESCRIPTION_PROPERTY} VARCHAR,
                    ${StationImportTransformer.OBS_PROC_METHOD_PROPERTY} VARCHAR,
                    ${StationImportTransformer.LATITUDE_PROPERTY} VARCHAR,
                    ${StationImportTransformer.LONGITUDE_PROPERTY} VARCHAR,
                    ${StationImportTransformer.ELEVATION_PROPERTY} VARCHAR,
                    ${StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY} INTEGER,
                    ${StationImportTransformer.OBS_FOCUS_ID_PROPERTY} INTEGER,
                    ${StationImportTransformer.OWNER_ID_PROPERTY} INTEGER,
                    ${StationImportTransformer.OPERATOR_ID_PROPERTY} INTEGER,
                    ${StationImportTransformer.WMO_ID_PROPERTY} VARCHAR,
                    ${StationImportTransformer.WIGOS_ID_PROPERTY} VARCHAR,
                    ${StationImportTransformer.ICAO_ID_PROPERTY} VARCHAR,
                    ${StationImportTransformer.STATUS_PROPERTY} VARCHAR,
                    ${StationImportTransformer.DATE_ESTABLISHED_PROPERTY} TIMESTAMPTZ,
                    ${StationImportTransformer.DATE_CLOSED_PROPERTY} TIMESTAMPTZ,
                    ${StationImportTransformer.COMMENT_PROPERTY} VARCHAR,
                    ${StationImportTransformer.ENTRY_USER_ID_PROPERTY} INTEGER NOT NULL
                ) ON COMMIT DROP;
            `;

            await queryRunner.query(createStagingTableQuery);

            // Step 2: COPY data into staging table
            const allColumns = StationImportTransformer.ALL_COLUMNS.join(', ');
            const copyQuery = `
                COPY ${stagingTableName} (${allColumns})
                FROM '${dbFilePathName}'
                WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');
            `;

            await queryRunner.query(copyQuery);

            // Step 3: Insert from staging to stations with ON CONFLICT handling.
            // Latitude and longitude are converted to a PostGIS Point geometry on insert.
            // Enum columns are cast to their PostgreSQL enum types.
            const upsertQuery = `
                INSERT INTO stations (
                    ${StationImportTransformer.ID_PROPERTY},
                    ${StationImportTransformer.NAME_PROPERTY},
                    ${StationImportTransformer.DESCRIPTION_PROPERTY},
                    ${StationImportTransformer.OBS_PROC_METHOD_PROPERTY},
                    location,
                    ${StationImportTransformer.ELEVATION_PROPERTY},
                    ${StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY},
                    ${StationImportTransformer.OBS_FOCUS_ID_PROPERTY},
                    ${StationImportTransformer.OWNER_ID_PROPERTY},
                    ${StationImportTransformer.OPERATOR_ID_PROPERTY},
                    ${StationImportTransformer.WMO_ID_PROPERTY},
                    ${StationImportTransformer.WIGOS_ID_PROPERTY},
                    ${StationImportTransformer.ICAO_ID_PROPERTY},
                    ${StationImportTransformer.STATUS_PROPERTY},
                    ${StationImportTransformer.DATE_ESTABLISHED_PROPERTY},
                    ${StationImportTransformer.DATE_CLOSED_PROPERTY},
                    ${StationImportTransformer.COMMENT_PROPERTY},
                    ${StationImportTransformer.ENTRY_USER_ID_PROPERTY}
                )
                SELECT
                    ${StationImportTransformer.ID_PROPERTY},
                    ${StationImportTransformer.NAME_PROPERTY},
                    ${StationImportTransformer.DESCRIPTION_PROPERTY},
                    ${StationImportTransformer.OBS_PROC_METHOD_PROPERTY}::stations_observation_processing_method_enum,
                    CASE WHEN ${StationImportTransformer.LATITUDE_PROPERTY} IS NOT NULL AND ${StationImportTransformer.LONGITUDE_PROPERTY} IS NOT NULL
                        THEN ST_SetSRID(ST_MakePoint(${StationImportTransformer.LONGITUDE_PROPERTY}::DOUBLE PRECISION, ${StationImportTransformer.LATITUDE_PROPERTY}::DOUBLE PRECISION), 4326)
                        ELSE NULL END,
                    ${StationImportTransformer.ELEVATION_PROPERTY}::DOUBLE PRECISION,
                    ${StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY},
                    ${StationImportTransformer.OBS_FOCUS_ID_PROPERTY},
                    ${StationImportTransformer.OWNER_ID_PROPERTY},
                    ${StationImportTransformer.OPERATOR_ID_PROPERTY},
                    ${StationImportTransformer.WMO_ID_PROPERTY},
                    ${StationImportTransformer.WIGOS_ID_PROPERTY},
                    ${StationImportTransformer.ICAO_ID_PROPERTY},
                    ${StationImportTransformer.STATUS_PROPERTY}::stations_status_enum,
                    ${StationImportTransformer.DATE_ESTABLISHED_PROPERTY},
                    ${StationImportTransformer.DATE_CLOSED_PROPERTY},
                    ${StationImportTransformer.COMMENT_PROPERTY},
                    ${StationImportTransformer.ENTRY_USER_ID_PROPERTY}
                FROM ${stagingTableName}
                ON CONFLICT (${StationImportTransformer.ID_PROPERTY})
                DO UPDATE SET
                    ${StationImportTransformer.NAME_PROPERTY} = EXCLUDED.${StationImportTransformer.NAME_PROPERTY},
                    ${StationImportTransformer.DESCRIPTION_PROPERTY} = EXCLUDED.${StationImportTransformer.DESCRIPTION_PROPERTY},
                    ${StationImportTransformer.OBS_PROC_METHOD_PROPERTY} = EXCLUDED.${StationImportTransformer.OBS_PROC_METHOD_PROPERTY},
                    location = EXCLUDED.location,
                    ${StationImportTransformer.ELEVATION_PROPERTY} = EXCLUDED.${StationImportTransformer.ELEVATION_PROPERTY},
                    ${StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY} = EXCLUDED.${StationImportTransformer.OBS_ENVIRONMENT_ID_PROPERTY},
                    ${StationImportTransformer.OBS_FOCUS_ID_PROPERTY} = EXCLUDED.${StationImportTransformer.OBS_FOCUS_ID_PROPERTY},
                    ${StationImportTransformer.OWNER_ID_PROPERTY} = EXCLUDED.${StationImportTransformer.OWNER_ID_PROPERTY},
                    ${StationImportTransformer.OPERATOR_ID_PROPERTY} = EXCLUDED.${StationImportTransformer.OPERATOR_ID_PROPERTY},
                    ${StationImportTransformer.WMO_ID_PROPERTY} = EXCLUDED.${StationImportTransformer.WMO_ID_PROPERTY},
                    ${StationImportTransformer.WIGOS_ID_PROPERTY} = EXCLUDED.${StationImportTransformer.WIGOS_ID_PROPERTY},
                    ${StationImportTransformer.ICAO_ID_PROPERTY} = EXCLUDED.${StationImportTransformer.ICAO_ID_PROPERTY},
                    ${StationImportTransformer.STATUS_PROPERTY} = EXCLUDED.${StationImportTransformer.STATUS_PROPERTY},
                    ${StationImportTransformer.DATE_ESTABLISHED_PROPERTY} = EXCLUDED.${StationImportTransformer.DATE_ESTABLISHED_PROPERTY},
                    ${StationImportTransformer.DATE_CLOSED_PROPERTY} = EXCLUDED.${StationImportTransformer.DATE_CLOSED_PROPERTY},
                    ${StationImportTransformer.COMMENT_PROPERTY} = EXCLUDED.${StationImportTransformer.COMMENT_PROPERTY},
                    ${StationImportTransformer.ENTRY_USER_ID_PROPERTY} = EXCLUDED.${StationImportTransformer.ENTRY_USER_ID_PROPERTY};
            `;

            await queryRunner.query(upsertQuery);

            // Step 4: Commit transaction - staging table is automatically dropped (ON COMMIT DROP)
            await queryRunner.commitTransaction();
            await this.stationsService.invalidateCache();

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
        const tmpTableName = `stations_download_user_${userId}_${Date.now()}`;
        const dbFilePathName = path.posix.join(this.fileIOService.dbExportsDir, `${tmpTableName}.csv`);
        const apiFilePathName = path.posix.join(this.fileIOService.apiExportsDir, `${tmpTableName}.csv`);

        try {
            await this.dataSource.query(`
                COPY (
                    SELECT
                        st.id,
                        st.name,
                        st.description,
                        st.observation_processing_method,
                        ST_Y(st.location) AS latitude,
                        ST_X(st.location) AS longitude,
                        st.elevation,
                        LOWER(env.name) AS observation_environment,
                        LOWER(foc.name) AS observation_focus,
                        st.wmo_id,
                        st.wigos_id,
                        st.icao_id,
                        st.status,
                        st.date_established::date AS date_established,
                        st.date_closed::date AS date_closed,
                        st.comment
                    FROM stations st
                    LEFT JOIN station_observation_environments env ON st.observation_environment_id = env.id
                    LEFT JOIN station_observation_focuses foc ON st.observation_focus_id = foc.id
                    ORDER BY st.id ASC
                ) TO '${dbFilePathName}' WITH (FORMAT csv, HEADER true, DELIMITER ',');
            `);

            return apiFilePathName;
        } catch (error) {
            this.logger.error('Stations Export Failed: ', error);
            throw new BadRequestException('File export Failed');
        }
    }

}
