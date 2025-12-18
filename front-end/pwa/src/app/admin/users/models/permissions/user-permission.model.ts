import { QCStatusEnum } from "src/app/data-ingestion/models/qc-status.enum";

export interface UserPermissionModel {
    stationsMetadataPermissions?: {
        stationIds?: string[]; 
    };

    entryPermissions?: {
        stationIds?: string[];
        observationPeriod?: ObservationPeriodPermissionsModel
    };

    importPermissions?: {
        importTemplateIds?: number[];
    };

    qcPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    ingestionMonitoringPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    exportPermissions?: ExportTemplatePermissionsModel;


}

export interface ExportTemplatePermissionsModel {
    stationIds?: string[];
    elementIds?: number[];
    intervals?: number[];
    observationPeriod?: ObservationPeriodPermissionsModel;
    qcStatuses?: QCStatusEnum[];
    exportTemplateIds?: number[];

}

export interface ObservationPeriodPermissionsModel {
    within?: {
        fromDate: string;
        toDate: string;
    };

    fromDate?: string;

    last?: {
        duration: number,
        durationType: 'days' | 'hours' ,
    };
}