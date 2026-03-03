import { BadRequestException, Injectable } from '@nestjs/common';
import { FileIOService } from 'src/shared/services/file-io.service';
import { StationsService } from './stations.service';
import { StationObsEnvService } from './station-obs-env.service';
import { StationObsFocusesService } from './station-obs-focuses.service';

@Injectable()
export class StationsImportExportService {

    constructor(
        private fileIOService: FileIOService,
        private stationService: StationsService,
        private stationObsEnvService: StationObsEnvService,
        private stationObsFocusService: StationObsFocusesService,
    ) { }

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
            await this.fileIOService.duckDbConn.run(createTableAndInserSQLs.createTable);

            // Insert the data into DuckDB
            for (const station of allStations) {
                const stationObsEnv = allStationObsEnv.find(item => item.id === station.stationObsEnvironmentId);
                const stationObsFocus = allStationObsFocus.find(item => item.id === station.stationObsFocusId);

                await this.fileIOService.duckDbConn.run(createTableAndInserSQLs.insert, {
                    1: station.id,
                    2: station.name,
                    3: station.description || '',
                    4: station.stationObsProcessingMethod,
                    5: station.latitude || '',
                    6: station.longitude || '',
                    7: station.elevation || '',
                    8: stationObsEnv?.name.toLowerCase() || '',
                    9: stationObsFocus?.name.toLowerCase() || '',
                    10: station.wmoId || '',
                    11: station.wigosId || '',
                    12: station.icaoId || '',
                    13: station.status || '',
                    14: station.dateEstablished?.substring(0, 10) || '',
                    15: station.dateClosed?.substring(0, 10) || '',
                    16: station.comment || ''
                });
            }

            // Export the DuckDB data into a CSV file
            const filePathName: string = `${this.fileIOService.apiExportsDir}/${tmpTableName}.csv`;
            await this.fileIOService.duckDbConn.run(`COPY (SELECT * FROM ${tmpTableName}) TO '${filePathName}' WITH (HEADER, DELIMITER ',');`);

            // Delete the stations table
            this.fileIOService.duckDbConn.run(`DROP TABLE ${tmpTableName};`);

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
