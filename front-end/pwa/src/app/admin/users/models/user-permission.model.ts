export interface UserPermissionModel {
    stationsMetadataPermissions?: {
        stationIds?: string[];
        // TODO. Include ability to to assign forms, elements, instruments, etc
    };

    entryPermissions?: {
        stationIds?: string[];
        // TODO. Include observation date range in future.
    };

    importPermissions?: {
        importTemplateIds?: number[]; 
         // TODO. In future add permissions like observation date range
    };

    qcPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    ingestionMonitoringPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    exportPermissions?: {
        exportTemplateIds?: number[];
        // TODO. In future add permissions like frequency and priority
    };

  
}