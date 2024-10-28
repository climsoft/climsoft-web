import { BadRequestException, Injectable } from '@nestjs/common';
import { FileIOService } from 'src/shared/services/file-io.service';
import { StationsService } from './stations.service';
import { ObservationImportService } from 'src/observation/services/observation-import.service';
import { StationObsProcessingMethodEnum } from '../enums/station-obs-processing-method.enum';
import { StringUtils } from 'src/shared/utils/string.utils';
import { StationEntity } from '../entities/station.entity';
import { CreateStationDto } from '../dtos/create-update-station.dto';
import { StationObsEnvService } from './station-obs-env.service';
import { StationObsFocusesService } from './station-obs-focuses.service';

@Injectable()
export class StationsImportExportService {


    private readonly ID_PROPERTY: keyof CreateStationDto = "id";
    private readonly NAME_PROPERTY: keyof CreateStationDto = "name";
    private readonly DESCRIPTION_PROPERTY: keyof CreateStationDto = "description";
    private readonly LATITUDE_PROPERTY: keyof CreateStationDto = "latitude";
    private readonly LONGITUDE_PROPERTY: keyof CreateStationDto = "longitude";
    private readonly ELEVATION_PROPERTY: keyof CreateStationDto = "elevation";
    private readonly OBS_PROC_METHOD_PROPERTY: keyof CreateStationDto = "stationObsProcessingMethod";
    private readonly OBS_ENVIRONMENT_ID_PROPERTY: keyof CreateStationDto = "stationObsEnvironmentId";
    private readonly OBS_FOCUS_ID_PROPERTY: keyof CreateStationDto = "stationObsFocusId";
    private readonly WMO_ID_PROPERTY: keyof CreateStationDto = "wmoId";
    private readonly WIGOS_ID_PROPERTY: keyof CreateStationDto = "wigosId";
    private readonly ICAO_ID_PROPERTY: keyof CreateStationDto = "icaoId";
    private readonly STATUS_PROPERTY: keyof CreateStationDto = "status";
    //private readonly DATE_ESTABLISHED_PROPERTY: keyof CreateStationDto = "date_established";
    //private readonly DATE_CLOSED_PROPERTY: keyof CreateStationDto = "date_closed";
    private readonly COMMENT_PROPERTY: keyof CreateStationDto = "comment";

    constructor(
        private fileIOService: FileIOService,
        private stationService: StationsService,
        private stationObsEnvService: StationObsEnvService,
        private stationObsFocusService: StationObsFocusesService
    ) { }



    public async importStations(file: Express.Multer.File, userId: number) {
        try {

            const tmpStationTableName = `stations_upload_user_${userId}_${new Date().getTime()}`;
            const filePathName: string = `${this.fileIOService.tempFilesFolderPath}/${tmpStationTableName}.csv`;

            // Save the file to the temporary directory
            await this.fileIOService.saveFile(file, filePathName);

            // Create a DuckDB table for stations
            await this.fileIOService.duckDb.run(this.getCreateStationsTableSQL(tmpStationTableName));

            // Read csv to duckdb for processing.
            //await this.fileIOService.duckDb.run(`CREATE OR REPLACE TABLE ${tmpStationTableName} AS SELECT * FROM read_csv('${filePathName}', header = true, all_varchar = true);`);
            await this.fileIOService.duckDb.run(`COPY ${tmpStationTableName} FROM read_csv('${filePathName}', header = true, all_varchar = true);`);

            // Make sure there are no empty ids and names
            await this.validateIdAndNameValues(tmpStationTableName);

            let alterSQLs: string;

            alterSQLs = this.getAlterLatLongElevationColumnSQL(tmpStationTableName);
            alterSQLs = alterSQLs + this.getAlterObsEnvColumnSQL(tmpStationTableName);
            alterSQLs = alterSQLs + this.getAlterObsFocusColumnSQL(tmpStationTableName);

            // Execute the duckdb DDL SQL commands
            await this.fileIOService.duckDb.exec(alterSQLs);

            const rows = await this.fileIOService.duckDb.all(`SELECT ${this.ID_PROPERTY}, ${this.NAME_PROPERTY}, ${this.DESCRIPTION_PROPERTY}, ${this.LATITUDE_PROPERTY}, ${this.LONGITUDE_PROPERTY}, ${this.ELEVATION_PROPERTY}, ${this.OBS_PROC_METHOD_PROPERTY}, ${this.OBS_ENVIRONMENT_ID_PROPERTY}, ${this.OBS_FOCUS_ID_PROPERTY}, ${this.WMO_ID_PROPERTY}, ${this.WIGOS_ID_PROPERTY}, ${this.ICAO_ID_PROPERTY}, ${this.STATUS_PROPERTY}, ${this.COMMENT_PROPERTY} FROM ${tmpStationTableName};`);

            console.log('stations imported: ', rows);
 

        } catch (error) {
            console.error("File Import Failed: ", error)
            throw new BadRequestException("File Import Failed: " + error.message);
        }
    }

    private async validateIdAndNameValues(tableName: string): Promise<void> {
        // Helper function to get count of empty values for a specific column
        const getEmptyCount = async (columnName: string): Promise<number> => {
            const result = await this.fileIOService.duckDb.all(
                `SELECT COUNT(*) AS empty_count FROM ${tableName} WHERE ${columnName} IS NULL OR ${columnName} = ''`
            );
            return Number(result[0].empty_count);
        };

        // Get counts of empty values for ID and Name columns
        const emptyIds = await getEmptyCount(this.ID_PROPERTY);
        const emptyNames = await getEmptyCount(this.NAME_PROPERTY);

        // If no empty values, return early
        if (emptyIds === 0 && emptyNames === 0) {
            return;
        }

        // Construct error message based on counts
        const messages: string[] = [];
        if (emptyIds > 0) messages.push(`Empty Ids detected: ${emptyIds}`);
        if (emptyNames > 0) messages.push(`Empty names detected: ${emptyNames}`);

        throw new Error(`Error: ${messages.join('. ')}.`);
    }


    private getAlterLatLongElevationColumnSQL(tableName: string): string {
        let sql: string;
        sql = `ALTER TABLE ${tableName} ALTER COLUMN ${this.LATITUDE_PROPERTY} TYPE DOUBLE;`;
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.LONGITUDE_PROPERTY} TYPE DOUBLE;`;
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEVATION_PROPERTY} TYPE DOUBLE;`;
        return sql;
    }

    private async getAlterObsEnvColumnSQL(tableName: string): Promise<string> {
        const obsEnv = (await this.stationObsEnvService.find()).map(item => {
            return { sourceId: item.name, databaseId: item.id };
        });
        return ObservationImportService.getDeleteAndUpdateSQL(tableName, this.OBS_ENVIRONMENT_ID_PROPERTY, obsEnv);
    }

    private async getAlterObsFocusColumnSQL(tableName: string): Promise<string> {
        const obsFocus = (await this.stationObsFocusService.find()).map(item => {
            return { sourceId: item.name, databaseId: item.id };
        });
        return ObservationImportService.getDeleteAndUpdateSQL(tableName, this.OBS_FOCUS_ID_PROPERTY, obsFocus);
    }


    public async exportStationsToCsv(userId: number): Promise<string> {
        try {
            const stations = await this.stationService.find();
            const tmpStationTableName = `stations_download_user_${userId}_${new Date().getTime()}`;

            // Create a DuckDB table for stations
            await this.fileIOService.duckDb.run(this.getCreateStationsTableSQL(tmpStationTableName));

            // Insert the data into DuckDB
            const insertStatement = this.fileIOService.duckDb.prepare(`
            INSERT INTO ${tmpStationTableName} (
             ${this.ID_PROPERTY}, 
             ${this.NAME_PROPERTY}, 
             ${this.DESCRIPTION_PROPERTY}, 
             ${this.LATITUDE_PROPERTY}, 
             ${this.LONGITUDE_PROPERTY},
             ${this.ELEVATION_PROPERTY},
             ${this.OBS_PROC_METHOD_PROPERTY},
             ${this.OBS_ENVIRONMENT_ID_PROPERTY},
             ${this.OBS_FOCUS_ID_PROPERTY},
             ${this.WMO_ID_PROPERTY},
             ${this.WIGOS_ID_PROPERTY},
             ${this.ICAO_ID_PROPERTY},
             ${this.STATUS_PROPERTY},
             ${this.COMMENT_PROPERTY}
             )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

            for (const station of stations) {
                await (await insertStatement).run(
                    station.id,
                    station.name,
                    station.description,
                    station.latitude,
                    station.longitude,
                    station.elevation,
                    station.stationObsProcessingMethod,
                    station.stationObsEnvironmentName,
                    station.stationObsFocusName,
                    station.wmoId,
                    station.wigosId,
                    station.icaoId,
                    station.status,
                    station.comment
                );
            }

            // TODO.Check on the download error.

            // Export the DuckDB data into a CSV file
            const filePathName: string = `${this.fileIOService.tempFilesFolderPath}/${tmpStationTableName}.csv`;
            await this.fileIOService.duckDb.run(`COPY (SELECT * FROM ${tmpStationTableName}) TO '${filePathName}' WITH (HEADER, DELIMITER ',');`);

            // Delete the stations table 
            this.fileIOService.duckDb.run(`DROP TABLE ${tmpStationTableName});`);

            // Return the path of the generated CSV file
            return filePathName;
        } catch (error) {
            console.error("File Export Failed: " + error)
            throw new BadRequestException("File export Failed: " + error);
        }

    }

    private getCreateStationsTableSQL(tmpStationTableName: string): string {
        // Create a DuckDB table for stations
        return `
        CREATE OR REPLACE TABLE ${tmpStationTableName} (
         ${this.ID_PROPERTY} VARCHAR,
         ${this.NAME_PROPERTY} VARCHAR,
         ${this.DESCRIPTION_PROPERTY} VARCHAR,
         ${this.LATITUDE_PROPERTY} VARCHAR,
         ${this.LONGITUDE_PROPERTY} VARCHAR,
         ${this.ELEVATION_PROPERTY} VARCHAR,
         ${this.OBS_PROC_METHOD_PROPERTY} VARCHAR,
         ${this.OBS_ENVIRONMENT_ID_PROPERTY} VARCHAR,
         ${this.OBS_FOCUS_ID_PROPERTY} VARCHAR,
         ${this.WMO_ID_PROPERTY} VARCHAR,
         ${this.WIGOS_ID_PROPERTY} VARCHAR,
         ${this.ICAO_ID_PROPERTY} VARCHAR,
         ${this.STATUS_PROPERTY} VARCHAR,
         ${this.COMMENT_PROPERTY} VARCHAR
        );
      `
    }



}
