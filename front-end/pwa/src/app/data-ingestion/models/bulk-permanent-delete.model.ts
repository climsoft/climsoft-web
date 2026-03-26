export interface BulkPermanentDeleteFilter {
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

export interface BulkPermanentDeleteCheckRequest {
    filter: BulkPermanentDeleteFilter;
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
