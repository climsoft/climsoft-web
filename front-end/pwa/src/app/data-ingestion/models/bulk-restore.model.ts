import { BulkObservationFilter } from './bulk-observation-filter.model';

export interface BulkRestoreCheckRequest {
    filter: BulkObservationFilter;
}

export interface BulkRestoreExecuteRequest {
    sessionId: string;
}

export interface BulkRestoreCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkRestoreExecuteResponse {
    restoredCount: number;
}
