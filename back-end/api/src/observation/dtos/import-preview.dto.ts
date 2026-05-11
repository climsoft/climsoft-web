import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min, ValidateIf, ValidateNested } from 'class-validator';
import { FileProcessingError } from 'src/metadata/file-processing-error.model';
import { CreateSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/create-source-specification.dto';
import { DefaultNull } from 'src/shared/decorators/default-null.decorator';

export class BaseParamsDto {
    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @IsInt()
    @Min(1)
    importAdapterId!: number | null;

    @IsInt()
    @Min(0)
    rowsToSkip!: number;

    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @IsString()
    @IsNotEmpty()
    delimiter!: string | null;
}

export class ProcessPreviewDto {
    @ValidateNested()
    @Type(() => CreateSourceSpecificationDto)
    sourceDefinition!: CreateSourceSpecificationDto;

    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @IsString()
    @IsNotEmpty()
    stationId!: string;
}


export class PreviewForImportDto {
    @IsInt()
    @Min(1)
    sourceId!: number;

    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @IsString()
    @IsNotEmpty()
    stationId!: string | null;
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
    error?: FileProcessingError;
}
