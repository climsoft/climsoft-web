import { BadRequestException, Injectable } from '@nestjs/common';
import { FileIOService } from 'src/shared/services/file-io.service';
import { StationsService } from './stations.service';
import { CreateStationDto } from '../dtos/create-update-station.dto';
import { StationObsEnvService } from './station-obs-env.service';
import { StationObsFocusesService } from './station-obs-focuses.service';
import { StationStatusEnum } from '../enums/station-status.enum';
import { StationObsProcessingMethodEnum } from '../enums/station-obs-processing-method.enum';
import { DuckDBUtils } from 'src/shared/utils/duckdb.utils';
import { TableData } from 'duckdb-async';

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
    private readonly DATE_ESTABLISHED_PROPERTY: keyof CreateStationDto = "dateEstablished";
    private readonly DATE_CLOSED_PROPERTY: keyof CreateStationDto = "dateClosed";
    private readonly COMMENT_PROPERTY: keyof CreateStationDto = "comment";

    constructor(
        private fileIOService: FileIOService,
        private stationService: StationsService,
        private stationObsEnvService: StationObsEnvService,
        private stationObsFocusService: StationObsFocusesService,
    ) { }

    public async import(file: Express.Multer.File, userId: number) {
        const tmpTableName = `stations_upload_user_${userId}_${new Date().getTime()}`;
        const tmpFilePathName: string = `${this.fileIOService.tempFilesFolderPath}/${tmpTableName}.csv`;
        // Save the file to the temporary directory
        await this.fileIOService.saveFile(file, tmpFilePathName);

        try {

            // Read csv to duckdb and create table.
            await this.fileIOService.duckDb.run(`CREATE OR REPLACE TABLE ${tmpTableName} AS SELECT * FROM read_csv('${tmpFilePathName}', header = false, skip = 1, all_varchar = true, delim = ',');`);

            // Make sure there are no empty ids and names
            //await this.validateIdAndNameValues(tmpStationTableName);

            let alterSQLs: string;
            // Rename all columns to use the expected suffix column indices
            alterSQLs = await DuckDBUtils.getRenameDefaultColumnNamesSQL(this.fileIOService.duckDb, tmpTableName);

            alterSQLs = alterSQLs + this.getAlterIdColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + this.getAlterNameColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + this.getAlterDescriptionColumnSQL(tmpTableName);
            alterSQLs = alterSQLs +  this.getAlterObsProcMethodColumnSQL(tmpTableName)
            alterSQLs = alterSQLs + this.getAlterLatLongElevationColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + await this.getAlterObsEnvColumnSQL(tmpTableName);
            alterSQLs = alterSQLs + await this.getAlterObsFocusColumnSQL(tmpTableName);
            alterSQLs = alterSQLs +  this.getAlterWMO_WIGOS_ICAO_IDSColumnSQL(tmpTableName);
            alterSQLs = alterSQLs +  this.getAlterStatusColumnSQL(tmpTableName);
            alterSQLs = alterSQLs +  this.getAlter_Established_Closed_DatesColumnSQL(tmpTableName);
            alterSQLs = alterSQLs +  this.getAlterCommentsColumnSQL(tmpTableName);

            // Execute the duckdb DDL SQL commands
            await this.fileIOService.duckDb.exec(alterSQLs);

             //check for duplicate ids
            const duplicates: TableData | undefined = await DuckDBUtils.getDuplicateCount(this.fileIOService.duckDb, tmpTableName, this.ID_PROPERTY);
            if (duplicates.length > 0) throw new Error(`Error: ${JSON.stringify(duplicates)}`);
            //check for duplicate names
            // duplicates = await DuckDBUtils.getDuplicateCount(this.fileIOService.duckDb, tmpTableName, this.NAME_PROPERTY);
            // if (duplicates.length > 0) throw new Error(`Error: ${JSON.stringify(duplicates)}`);

            // Get all the data imported
            const rows = await this.fileIOService.duckDb.all(`SELECT ${this.ID_PROPERTY}, ${this.NAME_PROPERTY}, ${this.DESCRIPTION_PROPERTY}, ${this.OBS_PROC_METHOD_PROPERTY}, ${this.LATITUDE_PROPERTY}, ${this.LONGITUDE_PROPERTY}, ${this.ELEVATION_PROPERTY}, ${this.OBS_ENVIRONMENT_ID_PROPERTY}, ${this.OBS_FOCUS_ID_PROPERTY}, ${this.WMO_ID_PROPERTY}, ${this.WIGOS_ID_PROPERTY}, ${this.ICAO_ID_PROPERTY}, ${this.STATUS_PROPERTY}, ${this.DATE_ESTABLISHED_PROPERTY}, ${this.DATE_CLOSED_PROPERTY}, ${this.COMMENT_PROPERTY} FROM ${tmpTableName};`);

            // Delete the stations table 
            this.fileIOService.duckDb.run(`DROP TABLE ${tmpTableName};`);

            // Save the stations
            await this.stationService.bulkPut(rows as CreateStationDto[], userId);

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

    private getAlterNameColumnSQL(tableName: string): string {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column1 TO ${this.NAME_PROPERTY};`;

        // null names not allowed 
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.NAME_PROPERTY} SET NOT NULL;`;
        return sql;
    }

    private getAlterDescriptionColumnSQL(tableName: string): string {
        return `ALTER TABLE ${tableName} RENAME column2 TO ${this.DESCRIPTION_PROPERTY};`;
    }

    private  getAlterObsProcMethodColumnSQL(tableName: string): string {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column3 TO ${this.OBS_PROC_METHOD_PROPERTY};`;

        // Convert all contents to lower case
        sql = sql + `UPDATE ${tableName} SET ${this.OBS_PROC_METHOD_PROPERTY} = lower(${this.OBS_PROC_METHOD_PROPERTY});`;

        // Get rows that have supported observation processing method only
        const obsProcMethods = Object.values(StationObsProcessingMethodEnum).map(item => {
            return { sourceId: item, databaseId: item };
        });
        sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.OBS_PROC_METHOD_PROPERTY, obsProcMethods, true);

        return sql;
    }

    private getAlterLatLongElevationColumnSQL(tableName: string): string {
        let sql: string = '';

        // Latitude
        sql = sql + `ALTER TABLE ${tableName} RENAME column4 TO ${this.LATITUDE_PROPERTY};`;
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.LATITUDE_PROPERTY} TYPE DOUBLE;`;

        // Longitude
        sql = sql + `ALTER TABLE ${tableName} RENAME column5 TO ${this.LONGITUDE_PROPERTY};`;
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.LONGITUDE_PROPERTY} TYPE DOUBLE;`;

        // Elevation
        sql = sql + `ALTER TABLE ${tableName} RENAME column6 TO ${this.ELEVATION_PROPERTY};`;
        sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ELEVATION_PROPERTY} TYPE DOUBLE;`;

        return sql;
    }

    private async getAlterObsEnvColumnSQL(tableName: string): Promise<string> {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column7 TO ${this.OBS_ENVIRONMENT_ID_PROPERTY};`;

        // Convert all contents to lower case
        sql = sql + `UPDATE ${tableName} SET ${this.OBS_ENVIRONMENT_ID_PROPERTY} = lower(${this.OBS_ENVIRONMENT_ID_PROPERTY});`;

        // Get rows that have supported observation environment and nulls only
        const obsEnv = (await this.stationObsEnvService.find()).map(item => {
            return { sourceId: item.name.toLowerCase(), databaseId: item.id };
        });
        sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.OBS_ENVIRONMENT_ID_PROPERTY, obsEnv, false);

        return sql;
    }

    private async getAlterObsFocusColumnSQL(tableName: string): Promise<string> {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column8 TO ${this.OBS_FOCUS_ID_PROPERTY};`;

        // Convert all contents to lower case
        sql = sql + `UPDATE ${tableName} SET ${this.OBS_FOCUS_ID_PROPERTY} = lower(${this.OBS_FOCUS_ID_PROPERTY});`;

        // Get rows that have supported observation focus and nulls only
        const obsFocus = (await this.stationObsFocusService.find()).map(item => {
            return { sourceId: item.name.toLowerCase(), databaseId: item.id };
        });
        sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.OBS_FOCUS_ID_PROPERTY, obsFocus, false);

        return sql;
    }

    private getAlterWMO_WIGOS_ICAO_IDSColumnSQL(tableName: string): string {
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column9 TO ${this.WMO_ID_PROPERTY};`;
        sql = sql + `ALTER TABLE ${tableName} RENAME column10 TO ${this.WIGOS_ID_PROPERTY};`;
        sql = sql + `ALTER TABLE ${tableName} RENAME column11 TO ${this.ICAO_ID_PROPERTY};`;

        return sql;
    }

    private  getAlterStatusColumnSQL(tableName: string): string{
        let sql: string = '';
        sql = sql + `ALTER TABLE ${tableName} RENAME column12 TO ${this.STATUS_PROPERTY};`;

        // Convert all contents to lower case
        sql = sql + `UPDATE ${tableName} SET ${this.STATUS_PROPERTY} = lower(${this.STATUS_PROPERTY});`;

        // Get rows that have supported status and nulls only
        const statuses = Object.values(StationStatusEnum).map(item => {
            return { sourceId: item, databaseId: item };
        });
        sql = sql + DuckDBUtils.getDeleteAndUpdateSQL(tableName, this.STATUS_PROPERTY, statuses, false);

        return sql;
    }

    private getAlter_Established_Closed_DatesColumnSQL(tableName: string): string {
        let sql: string = '';

        // Rename the date columns
        sql = sql + `ALTER TABLE ${tableName} RENAME column13 TO ${this.DATE_ESTABLISHED_PROPERTY};`;
        sql = sql + `ALTER TABLE ${tableName} RENAME column14 TO ${this.DATE_CLOSED_PROPERTY};`;

        // Format the strings to javascript expected iso format e.g `1981-01-01T06:00:00.000Z`
        sql = sql + `UPDATE ${tableName} SET ${this.DATE_ESTABLISHED_PROPERTY} = strftime(${this.DATE_ESTABLISHED_PROPERTY}::DATE, '%Y-%m-%dT%H:%M:%S.%g') || 'Z' WHERE ${this.DATE_ESTABLISHED_PROPERTY} IS NOT NULL;`;
        sql = sql + `UPDATE ${tableName} SET ${this.DATE_CLOSED_PROPERTY} = strftime(${this.DATE_CLOSED_PROPERTY}::DATE, '%Y-%m-%dT%H:%M:%S.%g') || 'Z' WHERE ${this.DATE_CLOSED_PROPERTY} IS NOT NULL;`;

        return sql;
    }

    private getAlterCommentsColumnSQL(tableName: string): string {
        return `ALTER TABLE ${tableName} RENAME column15 TO ${this.COMMENT_PROPERTY};`;
    }

    //------------------------------------
    // EXPORT FUNCTIONAILTY

    public async export(userId: number): Promise<string> {
        try {
            const allStations = await this.stationService.find();
            const allStationObsEnv = await this.stationObsEnvService.find();
            const allStationObsFocus = await this.stationObsFocusService.find();

            const tmpTableName = `stations_download_user_${userId}_${new Date().getTime()}`;
            const createTableAndInserSQLs = this.getCreateTableAndInsertSQL(tmpTableName);

            // Create a DuckDB table for stations
            await this.fileIOService.duckDb.run(createTableAndInserSQLs.createTable);

            // Insert the data into DuckDB
            const insertStatement = this.fileIOService.duckDb.prepare(createTableAndInserSQLs.insert);

            for (const station of allStations) {
                const stationObsEnv = allStationObsEnv.find(item => item.id === station.stationObsEnvironmentId);
                const stationObsFocus = allStationObsFocus.find(item => item.id === station.stationObsFocusId);

                await (await insertStatement).run(
                    station.id,
                    station.name,
                    station.description !== null ? station.description : '',
                    station.stationObsProcessingMethod,
                    station.latitude !== null ? station.latitude : '',
                    station.longitude !== null ? station.longitude : '',
                    station.elevation !== null ? station.elevation : '',
                    stationObsEnv ? stationObsEnv.name.toLowerCase() : '',
                    stationObsFocus ? stationObsFocus.name.toLowerCase() : '',
                    station.wmoId !== null ? station.wmoId : '',
                    station.wigosId !== null ? station.wigosId : '',
                    station.icaoId !== null ? station.icaoId : '',
                    station.status ? station.status : null,
                    station.dateEstablished ? station.dateEstablished.substring(0, 10) : null,
                    station.dateClosed ? station.dateClosed.substring(0, 10) : null,
                    station.comment !== null ? station.comment : ''
                );
            }

            (await insertStatement).finalize();

            // Export the DuckDB data into a CSV file
            const filePathName: string = `${this.fileIOService.tempFilesFolderPath}/${tmpTableName}.csv`;
            await this.fileIOService.duckDb.run(`COPY (SELECT * FROM ${tmpTableName}) TO '${filePathName}' WITH (HEADER, DELIMITER ',');`);

            // Delete the stations table 
            this.fileIOService.duckDb.run(`DROP TABLE ${tmpTableName};`);

            // Return the path of the generated CSV file
            return filePathName;
        } catch (error) {
            console.error("Stations Export Failed: ", error);
            throw new BadRequestException("File export Failed");
        }

    }

    private getCreateTableAndInsertSQL(tableName: string): { createTable: string, insert: string } {
        const fields: string[] = [
            'id', 'name', 'description', 'observation_processing_method',
            'latitude', 'longitude', 'elevation',
            'observation_environment', 'observation_focus',
            'wmo_id', 'wigos_id', 'icao_id',
            'status', 'date_established', 'date_closed',
            'comment'
        ];

        const createColumns = fields.map(item => `${item} VARCHAR`).join(', ');
        const insertColumns = fields.join(', ');
        const placeholders = fields.map(() => '?').join(', ');

        const createTableSQL = `  CREATE OR REPLACE TABLE ${tableName} (${createColumns}); `;
        const insertSQL = `INSERT INTO ${tableName} (${insertColumns}) VALUES (${placeholders});`;

        return { createTable: createTableSQL, insert: insertSQL };
    }



}
