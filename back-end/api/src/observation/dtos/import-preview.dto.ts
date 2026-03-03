import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CreateSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/create-source-specification.dto';

export class UpdateBaseParamsDto {
    @IsInt()
    @Min(0)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    delimiter?: string;
}

export class InitFromFileDto {
    @IsString()
    @IsNotEmpty()
    fileName: string;

    @IsInt()
    @Min(0)
    rowsToSkip: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    delimiter?: string;
}

export class ProcessPreviewDto {
    @ValidateNested()
    @Type(() => CreateSourceSpecificationDto)
    sourceDefinition: CreateSourceSpecificationDto;

    @IsOptional()
    @IsString()
    stationId?: string;
}


export class PreviewForImportDto {
    @IsInt()
    @Min(1)
    sourceId: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    stationId?: string;
}

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
