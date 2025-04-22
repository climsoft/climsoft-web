import { Injectable, Logger } from '@nestjs/common';
import * as mariadb from 'mariadb';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { CreateViewElementDto } from 'src/metadata/elements/dtos/elements/create-view-element.dto';
import { StationsService } from 'src/metadata/stations/services/stations.service';
import { CreateStationDto } from 'src/metadata/stations/dtos/create-update-station.dto';
import { StringUtils } from 'src/shared/utils/string.utils';
import { StationObsProcessingMethodEnum } from 'src/metadata/stations/enums/station-obs-processing-method.enum';
import { StationStatusEnum } from 'src/metadata/stations/enums/station-status.enum';
import { UsersService } from 'src/user/services/users.service';
import { SourceTemplatesService } from 'src/metadata/source-templates/services/source-templates.service';
import { AppConfig } from 'src/app.config';

export interface V4ElementModel {
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

export interface V4StationModel {
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
export class ClimsoftV4WebSyncSetUpService {
    private readonly logger = new Logger(ClimsoftV4WebSyncSetUpService.name);
    private firstConnectionAttemptAlreadyTried: boolean = false;
    public v4DBPool: mariadb.Pool | null = null;
    public v4UtcOffset: number = 0;
    public readonly v4Elements: Map<number, V4ElementModel> = new Map(); // Using map because of performance. 
    public readonly v4Stations: Set<string> = new Set();
    public readonly webSources: Map<number, string> = new Map();
    public readonly webUsers: Map<number, string> = new Map();
    public readonly webStations: Set<string> = new Set();
    public readonly webElements: Set<number> = new Set();
    public readonly v4Conflicts: string[] = [];

    constructor(
        private elementsService: ElementsService,
        private stationsService: StationsService,
        private sourcesService: SourceTemplatesService,
        private usersService: UsersService,
    ) {
    }

    /**
     * Attempts first connection to V4 database if the v4 db pool is not null and first attempt has never been tried.
     * @returns 
     */
    public async attemptFirstConnectionIfNotTried(): Promise<void> {
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
        this.logger.log('Attempting to connect: ' + 'Is Current connection pool active? ' + (this.v4DBPool != null) + '. Is first connection attempt? ' + this.firstConnectionAttemptAlreadyTried);
        this.firstConnectionAttemptAlreadyTried = true;
        try {

            // If there is an active connection then end it
            if (this.v4DBPool) {
                await this.disconnect();
            }

            // If not in dev mode and saving to or importing from version 4 is disabled then just return
            if (!AppConfig.v4DbCredentials.v4Save || !AppConfig.v4DbCredentials.v4Import) {
                this.logger.log('Saving to or importing from v4 database disabled.');
                return;
            }

            this.v4UtcOffset = AppConfig.v4DbCredentials.utcOffset;

            this.logger.log('creating connection pool for: ', AppConfig.v4DbCredentials.host);

            // create v4 database connection pool
            this.v4DBPool = mariadb.createPool({
                host: AppConfig.v4DbCredentials.host,
                user: AppConfig.v4DbCredentials.username,
                password: AppConfig.v4DbCredentials.password,
                database: AppConfig.v4DbCredentials.databaseName,
                port: AppConfig.v4DbCredentials.port,
            });

            // Clear any previous conflicts
            this.resetV4Conflicts();

            // set up V4 elements used v5 to v4 database for mapping  
            await this.setupV4ElementsForV5MappingAndChecking();

            // set up v4 stations used to check if v4 has elements that are in v5 database
            await this.setupV4StationsChecking();

            await this.setupV5Sources();

            await this.setupWebUsers();

            await this.setupWebStationsChecking();

            await this.setupWebElementsChecking();

        } catch (error) {
            this.logger.error('Setting up V4 database connection failed: ', error);
            this.v4DBPool = null;
        }
    }

    private async setupV4ElementsForV5MappingAndChecking(): Promise<void> {
        this.v4Elements.clear();
        (await this.getV4Elements()).forEach((item) => this.v4Elements.set(item.elementId, item));
    }

    private async setupV4StationsChecking(): Promise<void> {
        this.v4Stations.clear();
        (await this.getV4Stations()).forEach((item) => this.v4Stations.add(item.stationId));
    }

    public async setupV5Sources(): Promise<void> {
        this.webSources.clear();
        (await this.sourcesService.findAll()).forEach(item => this.webSources.set(item.id, item.name));
    }

    public async setupWebUsers(): Promise<void> {
        this.webUsers.clear();
        (await this.usersService.findAll()).forEach(item => this.webUsers.set(item.id, item.email));
    }

    private async setupWebStationsChecking(): Promise<void> {
        this.webStations.clear();
        (await this.stationsService.find()).forEach((item) => this.webStations.add(item.id));
    }

    private async setupWebElementsChecking(): Promise<void> {
        this.webElements.clear();
        (await this.elementsService.find()).forEach((item) => this.webElements.add(item.id));
    }

    public async disconnect(): Promise<void> {
        // If there is an active connection then end it
        if (this.v4DBPool) {
            await this.v4DBPool.end();
            this.v4DBPool = null;
        }
    }

    public getV4Conflicts(): string[] {
        return this.v4Conflicts;
    }

    public resetV4Conflicts(): void {
        this.v4Conflicts.length = 0;
    }

    public async getV4Elements(): Promise<V4ElementModel[]> {
        if (!this.v4DBPool) {
            return [];
        }

        let conn;
        try {
            conn = await this.v4DBPool.getConnection();
            const rows: V4ElementModel[] = await conn.query("SELECT elementId as elementId, abbreviation as abbreviation, elementName as elementName, description as description, elementScale as elementScale, upperLimit as upperLimit, lowerLimit as lowerLimit, units as units, elementtype as elementType, qcTotalRequired as qcTotalRequired, selected as selected FROM obselement WHERE selected = 1");
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

        const currentV5Elements: CreateViewElementDto[] = await this.elementsService.find();
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

            const currentV5Element = currentV5Elements.find(item => item.id === v4Element.elementId);

            const dto: CreateViewElementDto = {
                id: v4Element.elementId,
                abbreviation: v4Element.abbreviation,
                name: v4Element.elementName,
                description: v4Element.description,
                units: v4Element.units,
                typeId: currentV5Element ? currentV5Element.typeId : 1, // V4 does not support GCOS ECV structure so just assume it's type id 1             
                entryScaleFactor: v4Element.elementScale ? this.convertv4EntryScaleDecimalTov5WholeNumber(v4Element.elementScale) : null,
                totalEntryRequired: v4Element.qcTotalRequired === 1 ? true : false,
                comment: 'pulled from v4 model',
            };

            v5Dtos.push(dto);
        }

        await this.elementsService.bulkPut(v5Dtos, userId);

        // Important to do this just incase observations were not being saved to v4 database due to lack of elements or changes in v4 configuration
        await this.setupV4ElementsForV5MappingAndChecking();

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

    public async getV4Stations(): Promise<V4StationModel[]> {
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

        const currentV5Stations: CreateStationDto[] = await this.stationsService.find();
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

            // Make sure the wmo id is unique. V5 doesn't accept duplicates like v4 model
            if (v4Station.wmoid !== null && v5Dtos.find(item => item.wmoId === v4Station.wmoid)) {
                v4Station.wmoid = `${v4Station.wmoid}_${(i + 1)}`;
            }

            // Make sure the wigos id is unique. V5 doesn't accept duplicates like v4 model
            if (v4Station.wsi !== null && v5Dtos.find(item => item.wigosId === v4Station.wsi)) {
                v4Station.wsi = `${v4Station.wsi}_${(i + 1)}`;
            }

            // Make sure the icao id is unique. V5 doesn't accept duplicates like v4 model
            if (v4Station.icaoid !== null && v5Dtos.find(item => item.icaoId === v4Station.icaoid)) {
                v4Station.icaoid = `${v4Station.icaoid}_${(i + 1)}`;
            }

            const currentV5Station = currentV5Stations.find(item => item.id === v4Station.stationId);

            const dto: CreateStationDto = {
                id: v4Station.stationId,
                name: v4Station.stationName,
                description: currentV5Station ? currentV5Station.description : null,
                longitude: v4Station.longitude,
                latitude: v4Station.latitude,
                elevation: StringUtils.containsNumbersOnly(v4Station.elevation) ? Number.parseFloat(v4Station.elevation) : null,
                stationObsProcessingMethod: currentV5Station ? currentV5Station.stationObsProcessingMethod : StationObsProcessingMethodEnum.MANUAL, // TODO. Extrapolate from name?
                stationObsEnvironmentId: currentV5Station ? currentV5Station.stationObsEnvironmentId : null,// Give fixed land by default?
                stationObsFocusId: currentV5Station ? currentV5Station.stationObsFocusId : null, // extrapolate from qualifier?
                organisationId: currentV5Station ? currentV5Station.organisationId : null,
                wmoId: v4Station.wmoid,
                wigosId: v4Station.wsi,
                icaoId: v4Station.icaoid,
                status: v4Station.stationOperational ? StationStatusEnum.OPERATIONAL : StationStatusEnum.CLOSED,
                dateEstablished: currentV5Station ? currentV5Station.dateEstablished : null, // TODO. Confirm the date format and convert accordingly
                dateClosed: currentV5Station ? currentV5Station.dateClosed : null, // TODO. Confirm the date format and convert accordingly
                comment: 'pulled from v4 model',
            };

            v5Dtos.push(dto);
        }

        await this.stationsService.bulkPut(v5Dtos, userId);

        return true;
    }

}
