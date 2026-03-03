
export interface PreviewError {
    type: 'COLUMN_NOT_FOUND' | 'INVALID_COLUMN_POSITION' | 'SQL_EXECUTION_ERROR';
    message: string;
    detail?: string;
}

export interface PreviewTableData {
    columns: string[];
    rows: string[][]; // Preview rows
    totalRowCount: number; // All rows count
}

export interface RawPreviewResponse {
    sessionId: string;
    fileName: string;
    previewData: PreviewTableData;
    skippedData: PreviewTableData;
}

export interface TransformedPreviewResponse {
    previewData: PreviewTableData;
    error?: PreviewError;
}

