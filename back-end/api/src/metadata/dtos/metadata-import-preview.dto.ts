import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

// ─── Shared DTOs ─────────────────────────────────────────────

export class ValueMappingDto {
    @IsString()
    @IsNotEmpty()
    sourceId: string;

    @IsString()
    @IsNotEmpty()
    databaseId: string;
}

export class FieldMappingDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    columnPosition?: number;

    @IsOptional()
    @IsString()
    defaultValue?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ValueMappingDto)
    valueMappings?: ValueMappingDto[];
}

export class UpdateBaseParamsDto {
    @IsInt()
    @Min(0)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    delimiter?: string;
}

// ─── Station Column Mapping ──────────────────────────────────

export class StationColumnMappingDto {
    @IsInt()
    @Min(1)
    idColumnPosition: number;

    @IsInt()
    @Min(1)
    nameColumnPosition: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    descriptionColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    latitudeColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    longitudeColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    elevationColumnPosition?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    obsProcMethod?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    obsEnvironment?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    obsFocus?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    owner?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    operator?: FieldMappingDto;

    @IsOptional()
    @IsInt()
    @Min(1)
    wmoIdColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    wigosIdColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    icaoIdColumnPosition?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    status?: FieldMappingDto;

    @IsOptional()
    @IsInt()
    @Min(1)
    dateEstablishedColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    dateClosedColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    commentColumnPosition?: number;
}

// ─── Element Column Mapping ──────────────────────────────────

export class ElementColumnMappingDto {
    @IsInt()
    @Min(1)
    idColumnPosition: number;

    @IsInt()
    @Min(1)
    abbreviationColumnPosition: number;

    @IsInt()
    @Min(1)
    nameColumnPosition: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    descriptionColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    unitsColumnPosition?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    elementType?: FieldMappingDto;

    @IsOptional()
    @IsInt()
    @Min(1)
    entryScaleFactorColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    commentColumnPosition?: number;
}

// ─── Transform DTOs (sent from frontend during wizard steps) ─

export class StationTransformDto {
    @IsInt()
    @Min(0)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    delimiter?: string;

    @ValidateNested()
    @Type(() => StationColumnMappingDto)
    columnMapping: StationColumnMappingDto;
}

export class ElementTransformDto {
    @IsInt()
    @Min(0)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    delimiter?: string;

    @ValidateNested()
    @Type(() => ElementColumnMappingDto)
    columnMapping: ElementColumnMappingDto;
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
