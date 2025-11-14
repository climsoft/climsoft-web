import { QCStatusEnum } from "src/app/data-ingestion/models/qc-status.enum";

export interface UserPermissionModel {
    stationsMetadataPermissions?: {
        stationIds?: string[];
        // TODO. Include ability to to assign forms, elements, instruments, etc
    };

    entryPermissions?: {
        stationIds?: string[];
        importPermissions?: {
            importTemplateIds?: number[];
        };
        // TODO. Include observation date range in future.
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
    observationDate?: {
        last?: {
            duration: number,
            durationType: 'days' | 'hours' | 'minutes',
        };
        fromDate?: string;
        within?: {
            fromDate: string;
            toDate: string;
        };
    };
    qcStatus?: QCStatusEnum;
    exportTemplateIds?: number[];

}