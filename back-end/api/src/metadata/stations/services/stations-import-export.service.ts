import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, In, MoreThan, Repository } from 'typeorm';
import { StationEntity } from '../entities/station.entity';
import { StringUtils } from 'src/shared/utils/string.utils';
import { UpdateStationDto } from '../dtos/update-station.dto';
import { CreateStationDto } from '../dtos/create-update-station.dto';
import { ViewStationDto } from '../dtos/view-station.dto';
import { ViewStationQueryDTO } from '../dtos/view-station-query.dto';
import { StationChangesDto } from '../dtos/station-changes.dto';
import { FileIOService } from 'src/shared/services/file-io.service';
import { StationsService } from './stations.service';

@Injectable()
export class StationsImportExportService {


    private readonly ID_PROPERTY: string = "id";
    private readonly NAME_PROPERTY: string = "name";
    private readonly DESCRIPTION_PROPERTY: string = "description";
    private readonly LATITUDE_PROPERTY: string = "latitude";
    private readonly LONGITUDE_PROPERTY: string = "longitude";
    private readonly ELEVATION_PROPERTY: string = "elevation";
    private readonly OBS_METHOD_PROPERTY: string = "observation_processing_method";
    private readonly OBS_ENVIRONMENT_PROPERTY: string = "observation_environment";
    private readonly OBS_FOCUS_PROPERTY: string = "observation_focus";
    private readonly WMO_ID_PROPERTY: string = "wmo_id";
    private readonly ICAO_ID_PROPERTY: string = "icao_id";
    private readonly STATUS_PROPERTY: string = "status";
    private readonly DATE_ESTABLISHED_PROPERTY: string = "date_established";
    private readonly DATE_CLOSED_PROPERTY: string = "date_closed";
    private readonly COMMENT_PROPERTY: string = "comment";

    constructor(
        private stationService: StationsService,
        private fileIOService: FileIOService,
    ) { }



    public async importStations(file: Express.Multer.File, userId: number) {
        try {

            const tmpStationTableName = `stations_upload_user_${userId}_${new Date().getTime()}`;
            const filePathName: string = `${this.fileIOService.tempFilesFolderPath}/${tmpStationTableName}.csv`;

            // Save the file to the temporary directory
            await this.fileIOService.saveFile(file, filePathName);

            // Read csv to duckdb for processing.
            await this.fileIOService.duckDb.run(`CREATE OR REPLACE TABLE ${tmpStationTableName} AS SELECT * FROM read_csv('${filePathName}', header = true);`);


            // let alterSQLs: string = '';

            const rows = await this.fileIOService.duckDb.all(`SELECT * FROM ${tmpStationTableName}`);

            console.log('stations imported: ', rows);


        } catch (error) {
            console.error("File Import Failed: " + error)
            throw new BadRequestException("File Import Failed: " + error);
        }
    }

    // private getAlterStationColumnSQL( tableName: string): string {
    //     let sql: string;
    //     if (source.stationDefinition) {
    //         const stationDefinition = source.stationDefinition;
    //         // Set the station column name
    //         sql = `ALTER TABLE ${tableName} RENAME column${stationDefinition.columnPosition - 1} TO ${this.STATION_ID_PROPERTY_NAME};`;

    //         if (stationDefinition.stationsToFetch) {
    //             sql = sql + ObservationImportService.getDeleteAndUpdateSQL(tableName, this.STATION_ID_PROPERTY_NAME, stationDefinition.stationsToFetch);
    //         }

    //         // Ensure there are no nulls in the station column
    //         sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.STATION_ID_PROPERTY_NAME} SET NOT NULL;`;

    //     } else if (stationId) {
    //         sql = `ALTER TABLE ${tableName} ADD COLUMN ${this.STATION_ID_PROPERTY_NAME} VARCHAR DEFAULT '${stationId}';`;
    //     } else {
    //         throw new Error("Station must be provided");
    //     }

    //     return sql;
    // }

    public async exportStationsToCsv(userId: number) {
        try {

        } catch (error) {
            console.error("File Export Failed: " + error)
            throw new BadRequestException("File export Failed: " + error);
        }
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
         ${this.OBS_METHOD_PROPERTY},
         ${this.OBS_ENVIRONMENT_PROPERTY},
         ${this.OBS_FOCUS_PROPERTY},
         ${this.WMO_ID_PROPERTY},
         ${this.ICAO_ID_PROPERTY},
         ${this.STATUS_PROPERTY},
         ${this.DATE_ESTABLISHED_PROPERTY},
         ${this.DATE_CLOSED_PROPERTY},
         ${this.COMMENT_PROPERTY}
         )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

        for (const station of stations) {
            await (await insertStatement).run(
                station.id,
                station.name,
                station.description,
                station.location.latitude,
                station.location.longitude,
                station.elevation,
                station.stationObsProcessingMethodName,
                station.stationObsEnvironmentName,
                station.stationObsFocusName,
                station.wmoId,
                station.icaoId,
                station.status,
                station.dateEstablished,
                station.dateClosed,
                station.comment
            );
        }

        // Export the DuckDB data into a CSV file
        const filePathName: string = `${this.fileIOService.tempFilesFolderPath}/${tmpStationTableName}.csv`;
        await this.fileIOService.duckDb.run(`COPY (SELECT * FROM ${tmpStationTableName}) TO '${filePathName}' WITH (HEADER, DELIMITER ',')`);

        // Delete the stations table 
        this.fileIOService.duckDb.run(`DROP TABLE ${tmpStationTableName});`);

        // Return the path of the generated CSV file
        return filePathName;
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
         ${this.OBS_METHOD_PROPERTY} VARCHAR,
         ${this.OBS_ENVIRONMENT_PROPERTY} VARCHAR,
         ${this.OBS_FOCUS_PROPERTY} VARCHAR,
         ${this.WMO_ID_PROPERTY} VARCHAR,
         ${this.ICAO_ID_PROPERTY} VARCHAR,
         ${this.STATUS_PROPERTY} VARCHAR,
         ${this.DATE_ESTABLISHED_PROPERTY} VARCHAR,
         ${this.DATE_CLOSED_PROPERTY} VARCHAR,
         ${this.COMMENT_PROPERTY} VARCHAR
        );
      `
    }



}
