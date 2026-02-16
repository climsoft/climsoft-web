import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadPreviewDto {
    @IsInt()
    @Min(0)
    @Type(() => Number)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    delimiter?: string;
}

export class UpdateBaseParamsDto {
    @IsInt()
    @Min(0)
    @Type(() => Number)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    delimiter?: string;
}

export class ProcessPreviewDto {
    @IsOptional()// Skipping validation for now as the structure can be complex and dynamic
    sourceDefinition: any;

    @IsOptional()
    @IsString()
    stationId?: string;
}

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
}

export interface StepPreviewResponse {
    columns: string[];
    previewRows: string[][];
    totalRowCount: number;
    rowsDropped: number;
    warnings: PreviewWarning[];
    errors: PreviewError[];
}
