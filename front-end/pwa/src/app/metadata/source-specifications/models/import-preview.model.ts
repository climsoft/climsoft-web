
export interface BaseParamsDto {
    importAdapterId: number | null;
    rowsToSkip: number;
    delimiter: string | null;
}

export interface PreviewError {
    /**
     * Mirrors the transformer half of the API's `FileProcessingErrorType`.
     * DATETIME_FORMAT_MISMATCH: a date did not match the specification's
     * format. MISSING_REQUIRED_VALUE: a row lacks its station, element, level,
     * date/time or interval. NO_DATA: nothing to import — no data rows, or
     * every value missing.
     */
    type: 'COLUMN_NOT_FOUND' | 'INVALID_COLUMN_POSITION' | 'SQL_EXECUTION_ERROR'
        | 'DATETIME_FORMAT_MISMATCH' | 'MISSING_REQUIRED_VALUE' | 'NO_DATA';
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
    /** Plain-text head of the original uploaded file (pre-adapter, pre-DuckDB). */
    originalLines: string[];
}

export interface TransformedPreviewResponse {
    previewData: PreviewTableData;
    error?: PreviewError;
}

/** Combined response from the source-scoped preview endpoints. */
export interface PreviewForSourceResponse {
    raw: RawPreviewResponse;
    transformed: TransformedPreviewResponse;
}

