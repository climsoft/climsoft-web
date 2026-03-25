export interface BulkDeleteFilter {
    stationIds?: string[];
    elementIds?: number[];
    level?: number;
    intervals?: number[];
    sourceIds?: number[];
    fromDate?: string;
    toDate?: string;
    hour?: number;
    useEntryDate?: boolean;
}

export interface BulkDeleteCheckRequest {
    filter: BulkDeleteFilter;
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
