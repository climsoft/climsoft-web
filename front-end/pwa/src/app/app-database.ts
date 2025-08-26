import Dexie, { Table } from "dexie";
import { ViewRegionModel } from "./metadata/regions/models/view-region.model";
import { ViewSourceModel } from "./metadata/source-templates/models/view-source.model";
import { ViewStationObsEnvModel } from "./metadata/stations/models/view-station-obs-env.model";
import { ViewStationObsFocusModel } from "./metadata/stations/models/view-station-obs-focus.model";
import { StationSearchHistoryModel } from "./metadata/stations/models/stations-search-history.model";
import { CreateViewElementModel } from "./metadata/elements/models/create-view-element.model";
import { ViewElementTypeModel } from "./metadata/elements/models/view-element-type.model";
import { ViewElementSubdomainModel } from "./metadata/elements/models/view-element-subdomain.model";
import { ElementSearchHistoryModel } from "./metadata/elements/models/elements-search-history.model";
import { ViewQCTestModel } from "./core/models/elements/qc-tests/view-element-qc-test.model";
import { CachedObservationModel } from "./data-ingestion/services/observations.service";
import { UserSettingEnum } from "./app-config.service";
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

export interface UserSetting {
    name: UserSettingEnum;
    parameters: any;
}

export interface AppComponentState {
    id: string; // should be an enumeration
    parameters: any;
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
    // stationId, elementId, sourceId, level, datetime, interval  as compund key
    observations!: Table<CachedObservationModel, [string, number, number, number, string, number]>;

    //--------------------------------------

    //--------------------------------------
    // Front end related tables
    userSettings!: Table<UserSetting, string>;
    stationsSearchHistory!: Table<StationSearchHistoryModel, string>;
    elementsSearchHistory!: Table<ElementSearchHistoryModel, string>;
    //--------------------------------------

    constructor() {
        super('climsoft_db'); // Database name
        this.version(2).stores({
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
            generalSettings: `id, name`,

            stationNetworks: `stationId`,
            stationForms: `stationId`,
            formStations: `formId`,
            qcTests: `id, name, elementId, qcTestType, observationLevel, observationInterval, [elementId+qcTestType+observationLevel+observationInterval]`,

            // Note. Compoud key [stationId+elementId+sourceId+level+datetime+interval] is used for putting and deleting data in the local database. 
            // Note. Compound index [stationId+sourceId+level+elementId+datetime] is used by entry forms.
            observations: `[stationId+elementId+sourceId+level+datetime+interval], stationId, elementId, sourceId, level, datetime, interval, synced, entryDatetime, [stationId+sourceId+level+elementId+datetime]`,

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

