import { Injectable } from '@nestjs/common';
import * as mariadb from 'mariadb';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { ClimsoftV4DBSettingsDto } from 'src/settings/dtos/settings/climsoft-v4-db.dto';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { ObservationEntity } from '../entities/observation.entity';
import { Repository, UpdateResult } from 'typeorm';
import { StationsService } from 'src/metadata/stations/services/stations.service';
import { CreateStationDto } from 'src/metadata/stations/dtos/create-update-station.dto';
import { StringUtils } from 'src/shared/utils/string.utils';
import { StationObsProcessingMethodEnum } from 'src/metadata/stations/enums/station-obs-processing-method.enum';
import { StationStatusEnum } from 'src/metadata/stations/enums/station-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { NumberUtils } from 'src/shared/utils/number.utils';

interface V4ElementModel {
    elementId: number;
    abbreviation: string;
    elementName: string;
    description: string;
    elementScale: number;
    elementType: string;
    lowerLimit: string;
    upperLimit: string;
    units: string;
    qcTotalRequired: number;
    selected: number;
}

interface V4StationModel {
    stationId: string;
    stationName: string;
    wmoid: string;
    icaoid: string;
    wsi: string;
    longitude: number;
    latitude: number;
    elevation: string;
    qualifier: string;
    stationOperational: boolean;
    openingDatetime: string;
    closingDatetime: string;
    authority: string;
}


@Injectable()
export class ClimsoftV4Service {
    private firstConnectionAttemptAlreadyTried: boolean = false;
    private v4DBPool: mariadb.Pool | null = null;
    private v4UtcOffset: number = 0;
    private readonly v4Elements: Map<number, V4ElementModel> = new Map(); // Using map because of performance. 
    private isSaving: boolean = false;

    constructor(
        private generalSettingsService: GeneralSettingsService,
        private elementsService: ElementsService,
        private stationsService: StationsService,
        @InjectRepository(ObservationEntity) private observationRepo: Repository<ObservationEntity>,
    ) {
    }

    private async attemptFirstConnectionIfNotTried(): Promise<void> {
        if (this.v4DBPool !== null) {
            return;
        }
        if (this.firstConnectionAttemptAlreadyTried) {
            return;
        } else {
            await this.setupV4DBConnection();
        }
    }

    public getConnectionState(): boolean {
        return this.v4DBPool === null ? false : true;
    }

    /**
     * Creates a connection pool to v4 database. 
     * If a connection pool exists then it will end all connections and create a new connection pool based on the settings.
     * @returns 
     */
    public async setupV4DBConnection(): Promise<void> {
        console.log('Attempting to connect: ', 'Current connection pool: ', this.v4DBPool , '. Is first connection attempt',  this.firstConnectionAttemptAlreadyTried);
        this.firstConnectionAttemptAlreadyTried = true;
        try {

            // If there is an active connection then end it
            if (this.v4DBPool) {
                await this.disconnect();
            }


            // Load V4 DB connection setting
            const v4Setting: ClimsoftV4DBSettingsDto = (await this.generalSettingsService.find(1)).parameters as ClimsoftV4DBSettingsDto;

            console.log('V4 connection settings: ' , v4Setting);

            // If indicated as not to save to version 4 database then just return.
            if (!v4Setting.saveToV4DB) {
                return;
            }
           
            this.v4UtcOffset = v4Setting.utcOffset;

            // create v4 database connection pool
            this.v4DBPool = mariadb.createPool({
                host: v4Setting.serverIPAddress,
                user: v4Setting.username,
                password: v4Setting.password,
                database: v4Setting.databaseName,
                port: v4Setting.port
            });

            // Get V4 elements for mapping
            this.v4Elements.clear();

            const arrV4Elements: V4ElementModel[] = await this.getV4Elements();
            arrV4Elements.forEach((item) => this.v4Elements.set(item.elementId, item));

            this.getV4Stations(); // TODO. Delete this later
        } catch (error) {
            console.error('Setting up V4 database connection failed: ', error);
            this.v4DBPool = null;
        }
    }


    public async disconnect(): Promise<void> {
        // If there is an active connection then end it
        if (this.v4DBPool) {
            await this.v4DBPool.end();
            this.v4DBPool = null;
        }
    }

    private async getV4Elements(): Promise<V4ElementModel[]> {
        if (!this.v4DBPool) {
            return [];
        }

        let conn;
        try {
            conn = await this.v4DBPool.getConnection();
            const rows: V4ElementModel[] = await conn.query("SELECT elementId as elementId, abbreviation as abbreviation, elementName as elementName, description as description, elementScale as elementScale, upperLimit as upperLimit, lowerLimit as lowerLimit, units as units, elementtype as elementType, qcTotalRequired as qcTotalRequired, selected as selected FROM obselement");
            rows.forEach(item => {
                item.elementId = Number(item.elementId); // version 4 stores element ids as BigInt, so convert to number (int)
                item.elementType = item.elementType.trim().toLowerCase();
            });
            //console.log('element rows: ', rows[0]);
            return rows;
        } catch (error) {
            console.error('Setting up V4 elements failed: ', error);
            throw error;
        } finally {
            if (conn) conn.release(); //release to pool
        }

    }

    public async saveV4ElementsToV5DB(userId: number): Promise<boolean> {
        // if version 4 database pool is not set up then return.
        if (!this.v4DBPool) {
            return false;
        }

        const v4Elements: V4ElementModel[] = await this.getV4Elements();
        const v5Dtos: CreateViewElementDto[] = [];
        for (let i = 0; i < v4Elements.length; i++) {
            const v4Element: V4ElementModel = v4Elements[i];

            // Make sure abbreviation is not empty
            if (StringUtils.isNullOrEmpty(v4Element.abbreviation, true)) {
                v4Element.abbreviation = `Empty_${i + 1}`;
            }

            // Make sure name is not empty
            if (StringUtils.isNullOrEmpty(v4Element.elementName, true)) {
                v4Element.elementName = `Empty_${i + 1}`;
            }

            // Make sure the abbreviation is unique. V5 doesn't accept duplicates like v4 model
            if (v5Dtos.find(item => item.abbreviation === v4Element.abbreviation)) {
                v4Element.abbreviation = `${v4Element.abbreviation}_${(i + 1)}`;
            }

            // Make sure the name is unique. V5 doesn't accept duplicates like v4 model
            if (v5Dtos.find(item => item.name === v4Element.elementName)) {
                v4Element.elementName = `${v4Element.elementName}_${(i + 1)}`;
            }

            const dto: CreateViewElementDto = {
                id: v4Element.elementId,
                abbreviation: v4Element.abbreviation,
                name: v4Element.elementName,
                description: v4Element.description,
                units: v4Element.units,
                typeId: 1, // V4 does not support GCOS ECV structure so just assume it's type id 1             
                entryScaleFactor: v4Element.elementScale ? this.convertv4EntryScaleDecimalTov5WholeNumber(v4Element.elementScale) : null,
                totalEntryRequired: v4Element.qcTotalRequired === 1 ? true : false,
                comment: null,
            };

            v5Dtos.push(dto);
        }

        //console.log('saving elements: ', v5Dtos[0])
        await this.elementsService.bulkPut(v5Dtos, userId);

        // TODO. create and save upper limit and lower limit qc test

        return true;
    }

    private convertv4EntryScaleDecimalTov5WholeNumber(input: number): number {
        // If the input is a whole number, return it as is
        if (Number.isInteger(input)) {
            return input;
        }

        // Convert the input to a string and find the number of decimal places
        const decimalPlaces = input.toString().split('.')[1]?.length || 0;

        // Multiply the input by 10 raised to the number of decimal places
        return Math.pow(10, decimalPlaces);
    }

    private async getV4Stations(): Promise<V4StationModel[]> {
        // if version 4 database pool is not set up then return.
        if (!this.v4DBPool) {
            return [];
        }

        let conn;
        try {
            conn = await this.v4DBPool.getConnection();
            const rows: V4StationModel[] = await conn.query("SELECT stationId as stationId, stationName as stationName, wmoid as wmoid, icaoid as icaoid, wsi as wsi, longitude as longitude, latitude as latitude, elevation as elevation, qualifier as qualifier, stationOperational as stationOperational, openingDatetime as openingDatetime, closingDatetime as closingDatetime, authority as authority FROM station");
            //console.log('station rows: ', rows[0]);
            return rows;
        } catch (error) {
            console.error('Setting up V4 stations failed: ', error);
            throw error;
        } finally {
            if (conn) conn.release(); //release to pool
        }
    }

    public async saveV4StationsToV5DB(userId: number): Promise<boolean> {
        // if version 4 database pool is not set up then return.
        if (!this.v4DBPool) {
            return false;
        }

        const v4Stations: V4StationModel[] = await this.getV4Stations();
        const v5Dtos: CreateStationDto[] = [];
        for (let i = 0; i < v4Stations.length; i++) {
            const v4Station: V4StationModel = v4Stations[i];

            // Make sure name is not empty. V5 doesn't accept empty names 
            if (StringUtils.isNullOrEmpty(v4Station.stationName, true)) {
                v4Station.stationName = `Empty_${i + 1}`;
            }

            // Make sure the name is unique. V5 doesn't accept duplicates like v4 model
            if (v5Dtos.find(item => item.name === v4Station.stationName)) {
                v4Station.stationName = `${v4Station.stationName}_${(i + 1)}`;
            }

            const dto: CreateStationDto = {
                id: v4Station.stationId,
                name: v4Station.stationName,
                description: null,
                longitude: v4Station.longitude,
                latitude: v4Station.latitude,
                elevation: StringUtils.containsNumbersOnly(v4Station.elevation) ? Number.parseFloat(v4Station.elevation) : null,
                stationObsProcessingMethod: StationObsProcessingMethodEnum.MANUAL, // TODO. Extrapolate from name?
                stationObsEnvironmentId: null,// Give fixed land by default?
                stationObsFocusId: null, // extrapolate from qualifier?
                wmoId: v4Station.wmoid,
                wigosId: v4Station.wsi,
                icaoId: v4Station.icaoid,
                status: v4Station.stationOperational ? StationStatusEnum.OPERATIONAL : StationStatusEnum.CLOSED,
                dateEstablished: null, // TODO. Confirm the date format and convert accordingly
                dateClosed: null, // TODO. Confirm the date format and convert accordingly
                comment: null,
            };

            v5Dtos.push(dto);
        }

        await this.stationsService.bulkPut(v5Dtos, userId);

        return true;
    }

    public async saveObservationstoV4DB(): Promise<void> {
        await this.attemptFirstConnectionIfNotTried();

        // if version 4 database pool is not set up then return.
        // If still saving. then just return
        if (!this.v4DBPool || this.isSaving) {
            console.log('no connection pool or still saving. Aborting saving.');
            return;
        }

        // Set is saving to true to prevent any further saving to v4 requests
        this.isSaving = true;

        // Check if there is observations that have not been uploaded to v4
        // If there are, then attempt to save them
        const obsEntities: ObservationEntity[] = await this.observationRepo.find({
            where: { savedToV4: false },
            order: { entryDateTime: "ASC" },
            take: 1000,
        });

        console.log('entities found not saved to v4:', obsEntities.length, '. Aborting saving.');

        if (obsEntities.length === 0) {
            this.isSaving = false;
            console.log('No entities found. Aborting saving.');
            return;
        }

        console.log('Saving ', obsEntities.length, ' changes to V4 database');

        const deletedEntities: ObservationEntity[] = [];
        const insertedOrUpdatedEntities: ObservationEntity[] = [];

        for (const entity of obsEntities) {
            if (entity.deleted) {
                deletedEntities.push(entity);
            } else {
                insertedOrUpdatedEntities.push(entity);
            }
        }

        // Bulk delete when soft delete happens
        if (deletedEntities.length > 0) { 
            if (await this.deleteSoftDeletedV5DataFromV4DB(this.v4DBPool, deletedEntities)) {
                // Update the save to v4 column in the V5 database.
                await this.updateV5DBWithNewV4SaveStatus(this.observationRepo, deletedEntities);
            }
        }

        // Bulk insert or update when there are new inserts or updates
        if (insertedOrUpdatedEntities.length > 0) {
            if (await this.insertOrUpdateV5DataToV4DB(this.v4DBPool, insertedOrUpdatedEntities)) {
                // Update the save to v4 column in the V5 database.
                await this.updateV5DBWithNewV4SaveStatus(this.observationRepo, insertedOrUpdatedEntities);
            }
        }

        // Set saving to false before initiating another save operation
        this.isSaving = false;

        // Asynchronously initiate another save to version 4 operation
        this.saveObservationstoV4DB();

    }

    private async insertOrUpdateV5DataToV4DB(v4DBPool: mariadb.Pool, entities: ObservationEntity[]): Promise<boolean> {
        // Get a connection from the pool
        const connection = await v4DBPool.getConnection();
        try {
            const upsertStatement = `
                INSERT INTO observationinitial (
                    recordedFrom, 
                    describedBy, 
                    obsDatetime, 
                    obsLevel,
                    obsValue, 
                    flag,
                    period,             
                    qcStatus,
                    qcTypeLog,
                    acquisitionType,
                    dataForm,
                    capturedBy
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    obsLevel = VALUES(obsLevel),
                    obsValue = VALUES(obsValue),
                    flag = VALUES(flag),
                    period = VALUES(period),
                    qcStatus = VALUES(qcStatus),
                    qcTypeLog = VALUES(qcTypeLog),
                    acquisitionType = VALUES(acquisitionType),
                    dataForm = VALUES(dataForm),
                    capturedBy = VALUES(capturedBy)
            `;

            const values: (string | number | null)[][] = [];
            for (const entity of entities) {
                const v4Element = this.v4Elements.get(entity.elementId);
                // If element not found, just continue
                if (!v4Element) {
                    continue;
                }

                const v4ValueMap = this.getV4ValueMapping(v4Element, entity);

                values.push([
                    entity.stationId,
                    entity.elementId,
                    v4ValueMap.v4DBDatetime,
                    v4ValueMap.v4Elevation,
                    v4ValueMap.v4ScaledValue,
                    v4ValueMap.v4Flag,
                    v4ValueMap.v4DBPeriod, // period
                    0, // qcStatus
                    null, // qcTypeLog
                    7, // acquisitionType
                    null, // dataForm
                    entity.entryUserId // SHould we save with the username? 
                ]);

            }

            // Execute the batch upsert
            // TODO. Investigate if this will ever return an array
            const results: mariadb.UpsertResult = await connection.batch(upsertStatement, values);

            console.log('V4 insert update status:', results);

            // As of 03/02/2025, when an existing row is updated MariaDB counts this as a row affected twice
            // Once for detecting the conflict (i.e., attempting to insert)
            // Once for performing the update
            // So more affected rows should return true as well.
            return results.affectedRows >= entities.length;
        } catch (err) {
            console.error('Error saving observations to v4 initial table:', err);
            return false;
        } finally {
            if (connection) connection.release(); // Ensure the connection is released back to the pool
        }
    }

    private getV4ValueMapping(v4Element: V4ElementModel, entity: ObservationEntity): { v4Elevation: string, v4DBPeriod: number | null, v4ScaledValue: number | null, v4Flag: string | null, v4DBDatetime: string } {
        const period: number | null = (v4Element.elementType === 'daily') ? (entity.period / 1440) : null;
        // Important to round off due to precision errors
        const scaledValue: number | null = (entity.value && v4Element.elementScale ) ? NumberUtils.roundOff((entity.value / v4Element.elementScale), 4) : entity.value;
        const adjustedDatetime: string = this.getV4AdjustedDatetimeInDBFormat(entity.datetime);
        const elevation: string = entity.elevation === 0 ? 'surface' : `${entity.elevation}`;
        const flag: string | null = entity.flag ? entity.flag[0].toUpperCase() : null;
        return { v4Elevation: elevation, v4DBPeriod: period, v4ScaledValue: scaledValue, v4Flag: flag, v4DBDatetime: adjustedDatetime };
    }

    private getV4AdjustedDatetimeInDBFormat(date: Date): string {
        const dateAdjusted = new Date(date);
        dateAdjusted.setHours(dateAdjusted.getHours() + this.v4UtcOffset); // TODO. minus
        return dateAdjusted.toISOString().replace('T', ' ').replace('Z', '')
    }

    private async deleteSoftDeletedV5DataFromV4DB(v4DBPool: mariadb.Pool, entities: ObservationEntity[]): Promise<boolean> {
        // Get a connection from the pool
        const connection = await v4DBPool.getConnection();
        try {
            // Define the DELETE statement using the composite keys
            const deleteStatement = `
            DELETE FROM observationinitial
            WHERE recordedFrom = ?
              AND describedBy = ?
              AND obsDatetime = ?
              AND obsLevel = ?
              AND qcStatus = ?
              AND acquisitionType = ?
          `;

            // Build an array of values for each row to delete.
            // In this example we assume that the values used to generate the composite key 
            // are derived in the same way as in your insert/upsert function.
            const values: (string | number | null)[][] = [];
            for (const entity of entities) {

                // If it's not 
                if (!entity.deleted) {
                    continue;
                }

                // Retrieve the v4 element information
                const v4Element = this.v4Elements.get(entity.elementId);
                if (!v4Element) {
                    // Skip entities that do not have a corresponding v4 element
                    continue;
                }

                // Get the value mapping for the entity
                const v4ValueMap = this.getV4ValueMapping(v4Element, entity);

                // Populate the parameters for the composite key. These should match the values
                // that were inserted/updated originally.
                values.push([
                    entity.stationId,            // recordedFrom
                    entity.elementId,            // describedBy
                    v4ValueMap.v4DBDatetime,     // obsDatetime
                    v4ValueMap.v4Elevation,      // obsLevel
                    0,                           // qcStatus (as used in the upsert)
                    7                            // acquisitionType (as used in the upsert)
                ]);
            }

            // Execute the batch deletion.
            // Each set of parameters will run the DELETE statement.
            const results: mariadb.UpsertResult = await connection.batch(deleteStatement, values);

            console.log('Vv4 Delete status:', results);

            // Note:
            // If some of the keys do not exist in the database the affectedRows count may be lower
            // than the number of entities. So just return true
            return true;
        } catch (err) {
            console.error('Error deleting observations from v4 initial table:', err);
            return false;
        } finally {
            if (connection) connection.release(); // Ensure the connection is returned to the pool
        }
    }

    public async updateV5DBWithNewV4SaveStatus( observationRepo: Repository<ObservationEntity>,  observationsData: ObservationEntity[] ): Promise<UpdateResult> {
        // Build an array of objects representing each composite primary key.
        // Note: use the property names defined in your entity (not the DB column names).
        const compositeKeys = observationsData.map((obs) => ({
            stationId: obs.stationId,
            elementId: obs.elementId,
            elevation: obs.elevation,
            datetime: obs.datetime,
            period: obs.period,
            sourceId: obs.sourceId,
        }));

        // Use QueryBuilder's whereInIds to update all matching rows in a single query.
        return observationRepo
            .createQueryBuilder()
            .update(ObservationEntity)
            .set({ savedToV4: true })
            .whereInIds(compositeKeys)
            .execute();
    }




}
