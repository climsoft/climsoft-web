// ─── Shared Types ────────────────────────────────────────────

export interface ValueMappingModel {
    sourceId: string;
    databaseId: string;
}

export interface FieldMappingModel {
    columnPosition?: number;
    defaultValue?: string;
    valueMappings?: ValueMappingModel[];
}

// ─── Station Column Mapping ──────────────────────────────────

export interface StationColumnMappingModel {
    idColumnPosition: number;
    nameColumnPosition: number;
    descriptionColumnPosition?: number;
    latitudeColumnPosition?: number;
    longitudeColumnPosition?: number;
    elevationColumnPosition?: number;
    obsProcMethod?: FieldMappingModel;
    obsEnvironment?: FieldMappingModel;
    obsFocus?: FieldMappingModel;
    owner?: FieldMappingModel;
    operator?: FieldMappingModel;
    wmoIdColumnPosition?: number;
    wigosIdColumnPosition?: number;
    icaoIdColumnPosition?: number;
    status?: FieldMappingModel;
    dateEstablishedColumnPosition?: number;
    dateClosedColumnPosition?: number;
    commentColumnPosition?: number;
}

// ─── Element Column Mapping ──────────────────────────────────

export interface ElementColumnMappingModel {
    idColumnPosition: number;
    abbreviationColumnPosition: number;
    nameColumnPosition: number;
    descriptionColumnPosition?: number;
    unitsColumnPosition?: number;
    elementType?: FieldMappingModel;
    entryScaleFactorColumnPosition?: number;
    commentColumnPosition?: number;
}

// ─── Transform Models ────────────────────────────────────────

export interface StationTransformModel {
    rowsToSkip: number;
    delimiter?: string;
    columnMapping: StationColumnMappingModel;
}

export interface ElementTransformModel {
    rowsToSkip: number;
    delimiter?: string;
    columnMapping: ElementColumnMappingModel;
}

// ─── Response Interfaces ─────────────────────────────────────

export interface MetadataPreviewWarning {
    type: 'NULL_VALUES' | 'DUPLICATE_ROWS';
    message: string;
    affectedRowCount: number;
}

export interface MetadataPreviewError {
    type: 'COLUMN_NOT_FOUND' | 'INVALID_COLUMN_POSITION' | 'SQL_EXECUTION_ERROR';
    message: string;
    detail?: string;
}

export interface MetadataRawPreviewResponse {
    sessionId: string;
    fileName: string;
    columns: string[];
    totalRowCount: number;
    previewRows: string[][];
    skippedRows: string[][];
}

export interface MetadataStepPreviewResponse {
    columns: string[];
    previewRows: string[][];
    totalRowCount: number;
    rowsDropped: number;
    warnings: MetadataPreviewWarning[];
    error?: MetadataPreviewError;
}
