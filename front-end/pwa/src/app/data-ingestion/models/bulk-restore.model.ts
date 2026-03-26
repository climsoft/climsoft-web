export interface BulkRestoreFilter {
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

export interface BulkRestoreCheckRequest {
    filter: BulkRestoreFilter;
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
