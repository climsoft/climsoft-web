import { Injectable } from '@nestjs/common';
import * as mariadb from 'mariadb';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { ClimsoftV4DBSettingsDto } from 'src/settings/dtos/settings/climsoft-v4-db.dto';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { ObservationEntity } from '../entities/observation.entity';
import { FindManyOptions, Repository } from 'typeorm';
import { StationsService } from 'src/metadata/stations/services/stations.service';
import { CreateStationDto } from 'src/metadata/stations/dtos/create-update-station.dto';
import { StringUtils } from 'src/shared/utils/string.utils';
import { StationObsProcessingMethodEnum } from 'src/metadata/stations/enums/station-obs-processing-method.enum';
import { StationStatusEnum } from 'src/metadata/stations/enums/station-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { ClimsoftDBUtils } from 'src/observation/utils/climsoft-db.utils';

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

    public async testV4DBConnection(dto: ClimsoftV4DBSettingsDto): Promise<boolean> {
        try {
            // Create v4 database connection pool
            const v4DBPoolTest = mariadb.createPool({
                host: dto.serverIPAddress,
                user: dto.username,
                password: dto.password,
                database: dto.databaseName,
                port: dto.port
            });

            // Get a connection from the pool
            const connection = await v4DBPoolTest.getConnection();

            // If connection is successful, close it and terminate the pool
            connection.release(); // Release the connection back to the pool
            await v4DBPoolTest.end(); // Close the pool

            return true; // Connection was successful
        } catch (error) {
            console.error('Testing V4 database  connection failed: ', error);
            return false;
        }
    }

    private async attemptFirstConnectionIfNotTried(): Promise<void> {
        if (this.v4DBPool !== null) {
            return;
        }
        if (this.firstConnectionAttemptAlreadyTried) {
            return;
        } else {
            this.firstConnectionAttemptAlreadyTried = true;
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
        try {

            // If there is an active connection then end it
            if (this.v4DBPool) {
               await this.disconnect();
            }


            // Load V4 DB connection setting
            const v4Setting: ClimsoftV4DBSettingsDto = (await this.generalSettingsService.find(1)).parameters as ClimsoftV4DBSettingsDto;

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

            if (StringUtils.isNullOrEmpty(v4Element.abbreviation, true)) {
                v4Element.abbreviation = `Empty_${i + 1}`;
            }

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

        console.log('saving elements: ', v5Dtos[0])
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

            // Make sure name is not em[ty]. V5 doesn't accept empty names 
            if (StringUtils.isNullOrEmpty(v4Station.stationName, true)) {
                v4Station.stationName = `Empty_${i + 1}`;
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
            return;
        }

        this.isSaving = true;
        // Check if there is observations that have not been uploaded to v4
        // If there are, then attempt to save them

        const findOptions: FindManyOptions<ObservationEntity> = {
            where: { savedToV4: false },
            take: 1000,
        };

        // const obsEntities: ObservationEntity[] = await this.observationsService.findEntities(findOptions);
        const obsEntities: ObservationEntity[] = await this.observationRepo.find(findOptions);

        if (obsEntities.length > 0) {
            if (await this.bulkPutToV4(obsEntities)) {
                // TODO. update the v5 column
                obsEntities.forEach(item => {
                    item.savedToV4 = true;
                });
                ClimsoftDBUtils.insertOrUpdateObsValues(this.observationRepo, obsEntities);
                this.isSaving = false;
                this.saveObservationstoV4DB();
            } else {
                this.isSaving = false;
            }
        } else {
            this.isSaving = false;
        }
    }

    private async bulkPutToV4(entities: ObservationEntity[]): Promise<boolean> {
        // if version 4 database pool is not set up then return. 
        if (!this.v4DBPool || this.isSaving) {
            return false;
        }

        console.log(' v4DBPool: ', this.v4DBPool);

        // Get a connection from the pool
        const connection = await this.v4DBPool.getConnection();
        try {
            const batchSize = 1000;
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

            for (let i = 0; i < entities.length; i += batchSize) {
                const batch = entities.slice(i, i + batchSize);

                const values: (string | number | null)[][] = [];
                for (const entity of batch) {


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


                // const values = batch.map(dto => [
                //     dto.stationId,
                //     dto.elementId,
                //     this.getV4AdjustedDatetimeInDBFormat(dto.datetime),
                //     'surface',
                //     dto.value === null ? null : dto.value,
                //     dto.flag === null ? null : dto.flag,
                //     null, // period
                //     0, // qcStatus
                //     null, // qcTypeLog
                //     7, // acquisitionType
                //     null, // dataForm
                //     username
                // ]);

                // Execute the batch upsert
                const saved = await connection.batch(upsertStatement, values);

                console.log('saved:', saved);

            }

            return true;
        } catch (err) {
            console.error('Error saving observations to v4 initial table:', err);
            //throw err;
            return false;
        } finally {
            if (connection) connection.release(); // Ensure the connection is released back to the pool
        }
    }

    private getV4ValueMapping(v4Element: V4ElementModel, entity: ObservationEntity): { v4Elevation: string, v4DBPeriod: number | null, v4ScaledValue: number | null, v4Flag: string | null, v4DBDatetime: string } {
        const period: number | null = (v4Element.elementType === 'daily') ? (entity.period / 1440) : null;
        const scaledValue: number | null = (v4Element.elementScale && entity.value) ? (entity.value / v4Element.elementScale) : entity.value;
        const adjustedDatetime: string = this.getV4AdjustedDatetimeInDBFormat(entity.datetime);
        const elevation: string = entity.elevation === 0 ? 'surface' : `${entity.elevation}`;
        const flag: string | null = entity.flag ? entity.flag[0].toUpperCase() : null;
        return { v4Elevation: elevation, v4DBPeriod: period, v4ScaledValue: scaledValue, v4Flag: flag, v4DBDatetime: adjustedDatetime };
    }


    private getV4AdjustedDatetimeInDBFormat(date: Date): string {
        const dateAdjusted = new Date(date);
        dateAdjusted.setHours(dateAdjusted.getHours() + this.v4UtcOffset);
        return dateAdjusted.toISOString().replace('T', ' ').replace('Z', '')
    }

}
