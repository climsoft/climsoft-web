import Dexie, { Table } from "dexie";
import { CreateStationModel } from "./core/models/stations/create-station.model";
import { CreateElementModel } from "./core/models/elements/create-element.model";
import { ViewRegionModel } from "./core/models/Regions/view-region.model";
import { ViewSourceModel } from "./metadata/sources/models/view-source.model";
import { ViewStationObsEnvModel } from "./core/models/stations/view-station-obs-env.model";
import { ViewStationObsFocusModel } from "./core/models/stations/view-station-obs-focus.model";
import { StationSearchHistoryModel } from "./metadata/stations/models/stations-search-history.model";

export interface MetadataModificationLogModel {
    metadataName: keyof AppDatabase; // Except metadataModificationLog
    lastModifiedDate: string;
}

export class AppDatabase extends Dexie {
    metadataModificationLog!: Table<MetadataModificationLogModel, string>;
    stations!: Table<CreateStationModel, string>;
    stationObsEnv!: Table<ViewStationObsEnvModel, number>;
    stationObsFocus!: Table<ViewStationObsFocusModel, number>;
    elements!: Table<CreateElementModel, number>;
    sources!: Table<ViewSourceModel, number>;
    regions!: Table<ViewRegionModel, number>;
    
    stationsSearchHistory!: Table<StationSearchHistoryModel, string>;

    constructor() {
        super('climsoft_db'); // Database name
        this.version(1).stores({
            metadataModificationLog: 'metadataName',
            stations: `id, name, stationObsProcessingMethod, stationObsEnvironmentId, stationObsFocusId, wmoId, wigosId, icaoId, status, dateEstablished, dateClosed`,
            stationObsEnv: `id, name`,
            stationObsFocus: `id, name`,
            elements: `id, name, abbreviation, typeId`,
            sources: `id, name, sourceType`,
            regions: `id, name, regionType`,
            stationsSearchHistory: `name`,
        });
    }

    private static _instance: AppDatabase | null = null;

    public static get instance(): AppDatabase {
        // Create a singleton instance
        if (!AppDatabase._instance) {
            AppDatabase._instance = new AppDatabase();
        }
        return AppDatabase._instance;
    }

    public static async bulkAdd(tableName: keyof AppDatabase, records: any[]): Promise<any> {
        return (AppDatabase.instance[tableName] as Table).bulkAdd(records);
    }

    public static async clear(tableName: keyof AppDatabase): Promise<void> {
        return (AppDatabase.instance[tableName] as Table).clear();
    }

    public static async count(tableName: keyof AppDatabase): Promise<number> {
        return (AppDatabase.instance[tableName] as Table).count();
    }

}

