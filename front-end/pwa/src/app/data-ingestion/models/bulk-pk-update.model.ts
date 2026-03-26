export enum PkFieldEnum {
    STATION_ID = 'station_id',
    ELEMENT_ID = 'element_id',
    LEVEL = 'level',
    DATE_TIME = 'date_time',
    INTERVAL = 'interval',
    SOURCE_ID = 'source_id',
}

export enum DateTimeShiftUnitEnum {
    YEARS = 'years',
    MONTHS = 'months',
    DAYS = 'days',
    HOURS = 'hours',
}

export enum ConflictResolutionEnum {
    SKIP = 'skip',
    OVERWRITE = 'overwrite',
}

export interface PkChangeSpec {
    field: PkFieldEnum;
    fromValue?: string | number;
    toValue?: string | number;
    shiftAmount?: number;
    shiftUnit?: DateTimeShiftUnitEnum;
}

export interface BulkPkUpdateFilter {
    stationIds?: string[];
    elementIds?: number[];
    level?: number;
    intervals?: number[];
    sourceIds?: number[];
    fromDate?: string;
    toDate?: string;
    hours?: number[];
    useEntryDate?: boolean;
}

export interface BulkPkUpdateCheckRequest {
    filter: BulkPkUpdateFilter;
    change: PkChangeSpec;
}

export interface BulkPkUpdateExecuteRequest {
    sessionId: string;
    conflictResolution: ConflictResolutionEnum;
}

export interface BulkPkUpdateCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    conflictCount: number;
    permanentDeleteCount: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkPkUpdateExecuteResponse {
    updatedCount: number;
    skippedCount: number;
    permanentDeleteCount: number;
}
