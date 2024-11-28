// import { BadRequestException, Injectable } from '@nestjs/common';
// import { FileIOService } from 'src/shared/services/file-io.service';
// import { ObservationImportService } from 'src/observation/services/observation-import.service';
// import { Repository } from 'typeorm';
// import { InjectRepository } from '@nestjs/typeorm';
// import { StringUtils } from 'src/shared/utils/string.utils';
// import { ElementsService } from './elements.service';
// import { ElementEntity } from '../entities/element.entity';
// import { UpdateElementDto } from '../dtos/elements/update-element.dto';
// import { CreateViewElementDto } from '../dtos/elements/create-view-element.dto'; 

//@Injectable()
export class StationsImportExportService {


    // private readonly ID_PROPERTY: keyof CreateElementDto = "id";
    // private readonly NAME_PROPERTY: keyof CreateElementDto = "name";
    // private readonly DESCRIPTION_PROPERTY: keyof CreateElementDto = "description";
    // private readonly UNITS_PROPERTY: keyof CreateElementDto = "units";
    // private readonly TYPE_ID_PROPERTY: keyof CreateElementDto = "typeId";
    // private readonly TYPE_NAME_PROPERTY: keyof ViewElementDto = "typeName";
    // private readonly ENTRY_SCALE_PROPERTY: keyof CreateElementDto = "entryScaleFactor";
    // private readonly DATE_CLOSED_PROPERTY: keyof CreateStationDto = "dateClosed";
    // private readonly COMMENT_PROPERTY: keyof CreateElementDto = "comment";

    // constructor(
    //     private fileIOService: FileIOService,
    //     private stationService: ElementsService,
    //     // private stationObsEnvService: StationObsEnvService,
    //     // private stationObsFocusService: StationObsFocusesService,
    //     @InjectRepository(ElementEntity) private readonly stationRepo: Repository<ElementEntity>,
    // ) { }

    // public async importStations(file: Express.Multer.File, userId: number) {
    //     const tmpStationTableName = `stations_upload_user_${userId}_${new Date().getTime()}`;
    //     const tmpFilePathName: string = `${this.fileIOService.tempFilesFolderPath}/${tmpStationTableName}.csv`;
    //     // Save the file to the temporary directory
    //     await this.fileIOService.saveFile(file, tmpFilePathName);

    //     try {
    //         // Create a DuckDB table for stations
    //         await this.fileIOService.duckDb.run(this.getCreateStationsTableSQL(tmpStationTableName));

    //         // Read csv to duckdb for processing.
    //         await this.fileIOService.duckDb.run(`CREATE OR REPLACE TABLE ${tmpStationTableName} AS SELECT * FROM read_csv('${tmpFilePathName}', header = true, all_varchar = true);`);

    //         // Make sure there are no empty ids and names
    //         await this.validateIdAndNameValues(tmpStationTableName);

    //         let alterSQLs: string;
    //         alterSQLs = this.getAlterDescriptionColumnSQL(tmpStationTableName);
    //         alterSQLs = alterSQLs + this.getAlterLatLongElevationColumnSQL(tmpStationTableName);
    //         alterSQLs = alterSQLs + await this.getAlterSObsProcMethodColumnSQL(tmpStationTableName)
    //         alterSQLs = alterSQLs + await this.getAlterObsEnvColumnSQL(tmpStationTableName);
    //         alterSQLs = alterSQLs + await this.getAlterObsFocusColumnSQL(tmpStationTableName);
    //         alterSQLs = alterSQLs + await this.getAlterStatusColumnSQL(tmpStationTableName)

    //         // Execute the duckdb DDL SQL commands
    //         await this.fileIOService.duckDb.exec(alterSQLs);

    //         const rows = await this.fileIOService.duckDb.all(`SELECT ${this.ID_PROPERTY}, ${this.NAME_PROPERTY}, ${this.DESCRIPTION_PROPERTY}, ${this.UNITS_PROPERTY}, ${this.TYPE_ID_PROPERTY}, ${this.ENTRY_SCALE_PROPERTY}, ${this.COMMENT_METHOD_PROPERTY}, ${this.OBS_ENVIRONMENT_ID_PROPERTY}, ${this.OBS_FOCUS_ID_PROPERTY}, ${this.WMO_ID_PROPERTY}, ${this.WIGOS_ID_PROPERTY}, ${this.ICAO_ID_PROPERTY}, ${this.STATUS_PROPERTY}, ${this.COMMENT_PROPERTY} FROM ${tmpStationTableName};`);

    //         // Delete the stations table 
    //         this.fileIOService.duckDb.run(`DROP TABLE ${tmpStationTableName};`);

    //         // Save the stations
    //         await this.saveStations(rows as CreateStationDto[], userId);

    //     } catch (error) {
    //         console.error("File Import Failed: ", error)
    //         throw new BadRequestException("File Import Failed: " + error.message);
    //     } finally {
    //         this.fileIOService.deleteFile(tmpFilePathName);
    //     }
    // }

    // private async saveStations(dtos: CreateStationDto[], userId: number) {
    //     const entities: StationEntity[] = [];
    //     for (const dto of dtos) {
    //         let entity = await this.stationRepo.findOneBy({
    //             id: dto.id,
    //         });

    //         if (!entity) {
    //             entity = await this.stationRepo.create({
    //                 id: dto.id,
    //             });
    //         }

    //         entity.id = dto.id;
    //         dto.dateEstablished = dto.dateEstablished ? `${dto.dateEstablished}T00:00:00.000Z` : null;
    //         dto.dateClosed = dto.dateClosed ? `${dto.dateClosed}T00:00:00.000Z` : null;
    //         StationsService.updateStationEntity(entity, dto, userId);
    //         entities.push(entity);
    //     }

    //     await this.stationRepo.save(entities);
    // }

    // private async validateIdAndNameValues(tableName: string): Promise<void> {
    //     // Helper function to get count of empty values for a specific column
    //     const getEmptyCount = async (columnName: string): Promise<number> => {
    //         const result = await this.fileIOService.duckDb.all(
    //             `SELECT COUNT(*) AS empty_count FROM ${tableName} WHERE ${columnName} IS NULL OR ${columnName} = ''`
    //         );
    //         return Number(result[0].empty_count);
    //     };

    //     // Get counts of empty values for ID and Name columns
    //     const emptyIds = await getEmptyCount(this.ID_PROPERTY);
    //     const emptyNames = await getEmptyCount(this.NAME_PROPERTY);

    //     // If no empty values, return early
    //     if (emptyIds === 0 && emptyNames === 0) {
    //         return;
    //     }

    //     // Construct error message based on counts
    //     const messages: string[] = [];
    //     if (emptyIds > 0) messages.push(`Empty Ids detected: ${emptyIds}`);
    //     if (emptyNames > 0) messages.push(`Empty names detected: ${emptyNames}`);

    //     throw new Error(`Error: ${messages.join('. ')}.`);
    // }

    // private getAlterDescriptionColumnSQL(tableName: string): string {
    //     return `UPDATE ${tableName} SET ${this.DESCRIPTION_PROPERTY} = '' WHERE ${this.DESCRIPTION_PROPERTY} IS NULL;`;
    // }

    // private getAlterLatLongElevationColumnSQL(tableName: string): string {
    //     let sql: string;
    //     sql = `ALTER TABLE ${tableName} ALTER COLUMN ${this.UNITS_PROPERTY} TYPE DOUBLE;`;
    //     sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.TYPE_ID_PROPERTY} TYPE DOUBLE;`;
    //     sql = sql + `ALTER TABLE ${tableName} ALTER COLUMN ${this.ENTRY_SCALE_PROPERTY} TYPE DOUBLE;`;
    //     return sql;
    // }

    // private async getAlterSObsProcMethodColumnSQL(tableName: string): Promise<string> {
    //     let sql = `UPDATE ${tableName} SET ${this.COMMENT_METHOD_PROPERTY} = lower(${this.COMMENT_METHOD_PROPERTY});`;
    //     const obsProcMethods = Object.values(StationObsProcessingMethodEnum).map(item => {
    //         return { sourceId: StringUtils.formatEnumForDisplay(item).toLowerCase(), databaseId: item };
    //     });
    //     sql = sql + ObservationImportService.getDeleteAndUpdateSQL(tableName, this.COMMENT_METHOD_PROPERTY, obsProcMethods, true);
    //     return sql;
    // }

    // private async getAlterObsEnvColumnSQL(tableName: string): Promise<string> {
    //     let sql = `UPDATE ${tableName} SET ${this.OBS_ENVIRONMENT_ID_PROPERTY} = lower(${this.OBS_ENVIRONMENT_ID_PROPERTY});`;
    //     const obsEnv = (await this.stationObsEnvService.find()).map(item => {
    //         return { sourceId: item.name.toLowerCase(), databaseId: item.id };
    //     });
    //     sql = sql + ObservationImportService.getDeleteAndUpdateSQL(tableName, this.OBS_ENVIRONMENT_ID_PROPERTY, obsEnv, false);
    //     return sql;
    // }

    // private async getAlterObsFocusColumnSQL(tableName: string): Promise<string> {
    //     let sql = `UPDATE ${tableName} SET ${this.OBS_FOCUS_ID_PROPERTY} = lower(${this.OBS_FOCUS_ID_PROPERTY});`;
    //     const obsFocus = (await this.stationObsFocusService.find()).map(item => {
    //         return { sourceId: item.name.toLowerCase(), databaseId: item.id };
    //     });
    //     sql = sql + ObservationImportService.getDeleteAndUpdateSQL(tableName, this.OBS_FOCUS_ID_PROPERTY, obsFocus, false);
    //     return sql;
    // }

    // private async getAlterStatusColumnSQL(tableName: string): Promise<string> {
    //     let sql = `UPDATE ${tableName} SET ${this.STATUS_PROPERTY} = lower(${this.STATUS_PROPERTY});`;
    //     const statuses = Object.values(StationStatusEnum).map(item => {
    //         return { sourceId: StringUtils.formatEnumForDisplay(item).toLowerCase(), databaseId: item };
    //     });
    //     sql = sql + ObservationImportService.getDeleteAndUpdateSQL(tableName, this.STATUS_PROPERTY, statuses, false);
    //     return sql;
    // }

    // public async exportStationsToCsv(userId: number): Promise<string> {
    //     try {
    //         const stations = await this.stationService.find();
    //         const tmpStationTableName = `stations_download_user_${userId}_${new Date().getTime()}`;

    //         // Create a DuckDB table for stations
    //         await this.fileIOService.duckDb.run(this.getCreateStationsTableSQL(tmpStationTableName));

    //         // Insert the data into DuckDB
    //         const insertStatement = this.fileIOService.duckDb.prepare(`
    //         INSERT INTO ${tmpStationTableName} (
    //          ${this.ID_PROPERTY}, 
    //          ${this.NAME_PROPERTY}, 
    //          ${this.DESCRIPTION_PROPERTY}, 
    //          ${this.COMMENT_METHOD_PROPERTY},
    //          ${this.UNITS_PROPERTY}, 
    //          ${this.TYPE_ID_PROPERTY},
    //          ${this.ENTRY_SCALE_PROPERTY},             
    //          ${this.OBS_ENVIRONMENT_ID_PROPERTY},
    //          ${this.OBS_FOCUS_ID_PROPERTY},
    //          ${this.WMO_ID_PROPERTY},
    //          ${this.WIGOS_ID_PROPERTY},
    //          ${this.ICAO_ID_PROPERTY},
    //          ${this.STATUS_PROPERTY},
    //          ${this.DATE_ESTABLISHED_PROPERTY},
    //          ${this.DATE_CLOSED_PROPERTY},
    //          ${this.COMMENT_PROPERTY}
    //          )
    //         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    //       `);

    //         for (const station of stations) {
    //             await (await insertStatement).run(
    //                 station.id,
    //                 station.name,
    //                 station.description,
    //                 StringUtils.formatEnumForDisplay(station.stationObsProcessingMethod),
    //                 station.latitude,
    //                 station.longitude,
    //                 station.elevation,
    //                 station.stationObsEnvironmentName, // Use name instead of Id
    //                 station.stationObsFocusName, // Use name instead of Id
    //                 station.wmoId,
    //                 station.wigosId,
    //                 station.icaoId,
    //                 station.status ? StringUtils.formatEnumForDisplay(station.status) : null,
    //                 station.dateEstablished ? station.dateEstablished.substring(0, 10) : null,
    //                 station.dateClosed ? station.dateClosed.substring(0, 10) : null,
    //                 station.comment
    //             );
    //         }

    //         // Export the DuckDB data into a CSV file
    //         const filePathName: string = `${this.fileIOService.tempFilesFolderPath}/${tmpStationTableName}.csv`;
    //         await this.fileIOService.duckDb.run(`COPY (SELECT * FROM ${tmpStationTableName}) TO '${filePathName}' WITH (HEADER, DELIMITER ',');`);

    //         // Delete the stations table 
    //         this.fileIOService.duckDb.run(`DROP TABLE ${tmpStationTableName};`);

    //         // Return the path of the generated CSV file
    //         return filePathName;
    //     } catch (error) {
    //         console.error("File Export Failed: " + error)
    //         throw new BadRequestException("File export Failed: " + error);
    //     }

    // }

    // private getCreateStationsTableSQL(tmpStationTableName: string): string {
    //     // Create a DuckDB table for stations
    //     return `
    //     CREATE OR REPLACE TABLE ${tmpStationTableName} (
    //      ${this.ID_PROPERTY} VARCHAR,
    //      ${this.NAME_PROPERTY} VARCHAR,
    //      ${this.DESCRIPTION_PROPERTY} VARCHAR,
    //      ${this.COMMENT_METHOD_PROPERTY} VARCHAR,
    //      ${this.UNITS_PROPERTY} VARCHAR,
    //      ${this.TYPE_ID_PROPERTY} VARCHAR,
    //      ${this.ENTRY_SCALE_PROPERTY} VARCHAR,        
    //      ${this.OBS_ENVIRONMENT_ID_PROPERTY} VARCHAR,
    //      ${this.OBS_FOCUS_ID_PROPERTY} VARCHAR,
    //      ${this.WMO_ID_PROPERTY} VARCHAR,
    //      ${this.WIGOS_ID_PROPERTY} VARCHAR,
    //      ${this.ICAO_ID_PROPERTY} VARCHAR,
    //      ${this.STATUS_PROPERTY} VARCHAR,
    //      ${this.DATE_ESTABLISHED_PROPERTY} VARCHAR,
    //      ${this.DATE_CLOSED_PROPERTY} VARCHAR,
    //      ${this.COMMENT_PROPERTY} VARCHAR
    //     );
    //   `
    // }



}
