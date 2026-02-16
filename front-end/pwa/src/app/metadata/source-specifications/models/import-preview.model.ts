export interface PreviewWarning {
    type: 'NULL_VALUES' | 'FORMAT_MISMATCH' | 'UNMAPPED_IDS' | 'DUPLICATE_ROWS';
    message: string;
    affectedRowCount: number;
    sampleValues?: string[];
}

export interface PreviewError {
    type: 'COLUMN_NOT_FOUND' | 'INVALID_COLUMN_POSITION' | 'SQL_EXECUTION_ERROR' | 'MISSING_REQUIRED_FIELD';
    message: string;
    detail?: string;
}

export interface RawPreviewResponse {
    sessionId: string;
    columns: string[];
    totalRowCount: number;
    previewRows: string[][];
    skippedRows: string[][];
}

export interface StepPreviewResponse {
    columns: string[];
    previewRows: string[][];
    totalRowCount: number;
    rowsDropped: number;
    warnings: PreviewWarning[];
    errors: PreviewError[];
}
