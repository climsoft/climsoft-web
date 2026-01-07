import Dexie, { Table } from "dexie";
import { ViewRegionModel } from "./metadata/regions/models/view-region.model";
import { ViewSourceModel } from "./metadata/source-specifications/models/view-source.model";
import { ViewStationObsEnvModel } from "./metadata/stations/models/view-station-obs-env.model";
import { ViewStationObsFocusModel } from "./metadata/stations/models/view-station-obs-focus.model"; 
import { CreateViewElementModel } from "./metadata/elements/models/create-view-element.model";
import { ViewElementTypeModel } from "./metadata/elements/models/view-element-type.model";
import { ViewElementSubdomainModel } from "./metadata/elements/models/view-element-subdomain.model";
import { ElementSearchHistoryModel } from "./metadata/elements/models/elements-search-history.model";
import { ViewQCTestModel } from "./metadata/qc-tests/models/view-qc-test.model";
import { CachedObservationModel } from "./data-ingestion/services/observations.service"; 
import { CreateStationModel } from "./metadata/stations/models/create-station.model";
import { ViewOrganisationModel } from "./metadata/organisations/models/view-organisation.model";
import { ViewNetworkAffiliationModel } from "./metadata/network-affiliations/models/view-network-affiliation.model";
import { CreateViewGeneralSettingModel } from "./admin/general-settings/models/create-view-general-setting.model";

export interface MetadataModificationLogModel {
    metadataName: keyof AppDatabase; // Except metadataModificationLog
    lastModifiedDate: string;
}

export interface StationForm {
    stationId: string;
    forms: ViewSourceModel[];
}

export interface FormStation {
    formId: number;
    stationIds: string[];
}

export interface StationNetwork {
    stationId: string;
    networkAffiliations: ViewNetworkAffiliationModel[];
}

export enum UserAppStateEnum {
  USER_PROFILE = "user_profile",
  DATA_ENTRY_STATION_SELECTION = "data_entry_station_selection",
  ENTRY_FORM_SETTINGS = "form_settings", 
}

export interface AppComponentState {
    name: UserAppStateEnum;
    parameters: any;
}

export interface StationSearchHistoryModel {
    name: string;// name of the search
    stationIds: string[]; // stations selected
}

export class AppDatabase extends Dexie {
    //--------------------------------------
    // Back end related tables

    // Metadata tables
    // Cached through metadata updates
    metadataModificationLog!: Table<MetadataModificationLogModel, string>;

    organisations!: Table<ViewOrganisationModel, number>;
    networkAffiliations!: Table<ViewNetworkAffiliationModel, number>;
    regions!: Table<ViewRegionModel, number>;
    stationObsEnv!: Table<ViewStationObsEnvModel, number>;
    stationObsFocus!: Table<ViewStationObsFocusModel, number>;
    stations!: Table<CreateStationModel, string>;
    elementSubdomains!: Table<ViewElementSubdomainModel, number>;
    elementTypes!: Table<ViewElementTypeModel, number>;
    elements!: Table<CreateViewElementModel, number>;
    sourceTemplates!: Table<ViewSourceModel, number>;
    generalSettings!: Table<CreateViewGeneralSettingModel, number>;


    // cached differently
    stationForms!: Table<StationForm, string>;
    formStations!: Table<FormStation, number>;
    stationNetworks!: Table<StationNetwork, string>;
    qcTests!: Table<ViewQCTestModel, number>;
    // stationId, elementId, level, datetime, interval, sourceId  as compund key
    observations!: Table<CachedObservationModel, [string, number, number, string, number, number]>;

    //--------------------------------------

    //--------------------------------------
    // Front end related tables
    userSettings!: Table<AppComponentState, string>;
    stationsSearchHistory!: Table<StationSearchHistoryModel, string>;
    elementsSearchHistory!: Table<ElementSearchHistoryModel, string>;
    //--------------------------------------

    constructor() {
        // Database name
        super('climsoft_preview_db');

        this.version(1).stores({
            metadataModificationLog: 'metadataName',
            organisations: `id, name`,
            networkAffiliations: `id, name`,
            regions: `id, name, regionType`,
            stations: `id, name, stationObsProcessingMethod, stationObsEnvironmentId, stationObsFocusId, organisationId, wmoId, wigosId, icaoId, status, dateEstablished, dateClosed`,
            stationObsEnv: `id, name`,
            stationObsFocus: `id, name`,
            elementSubdomains: `id, name`,
            elementTypes: `id, name, subdomainId`,
            elements: `id, name, abbreviation, typeId`,
            sourceTemplates: `id, name, sourceType`,
            stationNetworks: `stationId`,
            stationForms: `stationId`,
            formStations: `formId`,
            qcTests: 'id, name, elementId, qcTestType, observationLevel, observationInterval, [elementId+qcTestType+observationLevel+observationInterval]',
            generalSettings: 'id, name',

            // Note. Compoud key [stationId+elementId+level+datetime+interval+sourceId] is used for putting and deleting data in the local database. 
            // Note. Compound index [stationId+sourceId+level+elementId+datetime] is used by entry forms.
            observations: `[stationId+elementId+level+datetime+interval+sourceId], stationId, elementId, sourceId, level, datetime, interval, synced, entryDatetime, [stationId+sourceId+level+elementId+datetime]`,

            userSettings: `name`,
            stationsSearchHistory: `name`,
            elementsSearchHistory: `name`,
        });
    }

    private static _instance: AppDatabase | null = null;

    public static get instance(): AppDatabase {
        // Create a singleton instance
        if (!AppDatabase._instance) {
            AppDatabase._instance = new AppDatabase();
            //console.log('Code-declared version:', AppDatabase._instance .verno);              // Dexie’s declared version (from your code)
            //console.log('On-disk version:', AppDatabase._instance .backendDB().version);      // Actual IDB version
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

