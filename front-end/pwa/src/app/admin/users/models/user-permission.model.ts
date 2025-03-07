export interface UserPermissionModel {
    entryPermissions?: {
        stationIds?: string[];
        // TODO. Include range in future.
    };

    qcPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    analysisPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    exportPermissions?: {
        exportTemplateIds: number[];
        // TODO. In future add permissions like frequency and priority
    };

    stationsMetadataPermissions?: {
        stationIds: string[];
        // TODO. Include ability to to assign forms, elements, instruments, etc
    };
}