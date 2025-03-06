export interface UserPermissionModel {
    entryPermissions?: {
        stationIds?: string[];
        // TODO. Include range in future.
    };

    qcPermissions?: {
        stationIds?: string[];
        // TODO. Include range
    };

    exportPermissions?: number[];

    analysisPermissions: {
        stationIds?: string[];
        // TODO. Include range
    };

    stationsMetadataPermissions?: {
        stationIds: string[];
        // TODO. Include ability to to assign forms, elements, instruments, etc
    };
}