import Dexie, { Table } from "dexie";
import { CreateStationModel } from "./core/models/stations/create-station.model";
import { ViewRegionModel } from "./core/models/Regions/view-region.model";
import { ViewSourceModel } from "./metadata/sources/models/view-source.model";
import { ViewStationObsEnvModel } from "./core/models/stations/view-station-obs-env.model";
import { ViewStationObsFocusModel } from "./core/models/stations/view-station-obs-focus.model";
import { StationSearchHistoryModel } from "./metadata/stations/models/stations-search-history.model";
import { CreateViewElementModel } from "./metadata/elements/models/create-view-element.model";
import { ViewElementTypeModel } from "./metadata/elements/models/view-element-type.model";
import { ViewElementSubdomainModel } from "./metadata/elements/models/view-element-subdomain.model";
import { ElementSearchHistoryModel } from "./metadata/elements/models/elements-search-history.model";
import { ViewElementQCTestModel } from "./core/models/elements/qc-tests/view-element-qc-test.model";

export interface MetadataModificationLogModel {
    metadataName: keyof AppDatabase; // Except metadataModificationLog
    lastModifiedDate: string;
}

export interface StationForm {
    stationId: string;
    forms: ViewSourceModel[];
}

export class AppDatabase extends Dexie {
    // Cached through metadata updates
    metadataModificationLog!: Table<MetadataModificationLogModel, string>;
    stationObsEnv!: Table<ViewStationObsEnvModel, number>;
    stationObsFocus!: Table<ViewStationObsFocusModel, number>;
    stations!: Table<CreateStationModel, string>;
    elementSubdomains!: Table<ViewElementSubdomainModel, number>;
    elementTypes!: Table<ViewElementTypeModel, number>;
    elements!: Table<CreateViewElementModel, number>;
    sources!: Table<ViewSourceModel, number>;
    regions!: Table<ViewRegionModel, number>;

    // cached separately
    stationForms!: Table<StationForm, string>;  
    elementsQcTests!: Table<ViewElementQCTestModel, number>;    
    stationsSearchHistory!: Table<StationSearchHistoryModel, string>;
    elementsSearchHistory!: Table<ElementSearchHistoryModel, string>;

    constructor() {
        super('climsoft_db'); // Database name
        this.version(1).stores({
            metadataModificationLog: 'metadataName',
            stations: `id, name, stationObsProcessingMethod, stationObsEnvironmentId, stationObsFocusId, wmoId, wigosId, icaoId, status, dateEstablished, dateClosed`,
            stationObsEnv: `id, name`,
            stationObsFocus: `id, name`,
            elementSubdomains: `id, name`,
            elementTypes: `id, name, subdomainId`,
            elements: `id, name, abbreviation, typeId`,
            sources: `id, name, sourceType`,
            regions: `id, name, regionType`,

            stationForms: `stationId`,
            elementsQcTests: `id, elementId, qcTestType, observationPeriod, [elementId+qcTestType+observationPeriod]`,
            stationsSearchHistory: `name`,
            elementsSearchHistory: `name`,
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

    public static async bulkPut(tableName: keyof AppDatabase, records: any[]): Promise<any> {
        return (AppDatabase.instance[tableName] as Table).bulkPut(records);
    }

    public static async clear(tableName: keyof AppDatabase): Promise<void> {
        return (AppDatabase.instance[tableName] as Table).clear();
    }

    public static async count(tableName: keyof AppDatabase): Promise<number> {
        return (AppDatabase.instance[tableName] as Table).count();
    }

}

