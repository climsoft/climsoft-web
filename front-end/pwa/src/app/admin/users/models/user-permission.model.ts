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

    exportPermissions?: {
        exportTemplateIds?: number[];
        // TODO. In future add permissions like frequency and priority
    };

  
}