import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/create-source-specification.dto';

// export class UploadPreviewDto {
//     @IsInt()
//     @Min(0)
//     rowsToSkip: number;

//     @IsOptional()
//     @IsString()
//     delimiter?: string;
// }

export class UpdateBaseParamsDto {
    @IsInt()
    @Min(0)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    delimiter?: string;
}

export class InitFromFileDto {
    @IsString()
    fileName: string;

    @IsInt()
    @Min(0)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    delimiter?: string;
}

export class ProcessPreviewDto {
    @IsOptional()// TODO. Do validation.
    sourceDefinition: CreateSourceSpecificationDto;

    @IsOptional()
    @IsString()
    stationId?: string;
}

export class PreviewForImportDto {
    @IsInt()
    sourceId: number;

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
    type: 'COLUMN_NOT_FOUND' | 'INVALID_COLUMN_POSITION' | 'SQL_EXECUTION_ERROR';
    message: string;
    detail?: string;
}

export interface RawPreviewResponse {
    sessionId: string;
    fileName: string;
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
    error?: PreviewError;
}
