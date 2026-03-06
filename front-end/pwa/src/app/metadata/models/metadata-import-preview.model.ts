import { DateTimeDefinition } from '../source-specifications/models/import-source-tabular-params.model';

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
    dateEstablishedDefinition?: DateTimeDefinition;
    dateClosedDefinition?: DateTimeDefinition;
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