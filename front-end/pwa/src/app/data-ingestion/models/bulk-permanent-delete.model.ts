import { BulkObservationFilter } from './bulk-observation-filter.model';

export interface BulkPermanentDeleteCheckRequest {
    filter: BulkObservationFilter;
}

export interface BulkPermanentDeleteExecuteRequest {
    sessionId: string;
}

export interface BulkPermanentDeleteCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkPermanentDeleteExecuteResponse {
    deletedCount: number;
}
