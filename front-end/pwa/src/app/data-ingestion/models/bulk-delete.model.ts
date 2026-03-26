import { BulkObservationFilter } from './bulk-observation-filter.model';

export interface BulkDeleteCheckRequest {
    filter: BulkObservationFilter;
}

export interface BulkDeleteExecuteRequest {
    sessionId: string;
}

export interface BulkDeleteCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkDeleteExecuteResponse {
    deletedCount: number;
}
