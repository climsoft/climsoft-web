import { BulkObservationFilter } from './bulk-observation-filter.model';

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

export interface BulkPkUpdateCheckRequest {
    filter: BulkObservationFilter;
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
