import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateIf, ValidateNested } from 'class-validator';
import { FileProcessingError } from 'src/metadata/file-processing-error.model';
import { CreateSourceSpecificationDto } from 'src/metadata/source-specifications/dtos/create-source-specification.dto';
import { DefaultNull } from 'src/shared/decorators/default-null.decorator';

export class BaseParamsDto {
    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @Type(() => Number) 
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

export class PreviewForStepDto {
    @ValidateNested()
    @Type(() => CreateSourceSpecificationDto)
    sourceDefinition!: CreateSourceSpecificationDto;

    @DefaultNull()
    @ValidateIf((_o, v) => v !== null)
    @IsString()
    @IsNotEmpty()
    stationId!: string | null;
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

/**
 * Request body for the source-scoped preview endpoints used by the
 * import-entry flow. The source is identified in the URL, so only the
 * optional station selection travels in the body.
 */
export class PreviewForSourceDto {
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

/**
 * Combined response returned by the source-scoped preview endpoints.
 * Bundles both the raw preview (post-adapter, if any) and the transformed
 * preview so the entry dialog only makes one round trip per user action.
 */
export interface PreviewForSourceResponse {
    raw: RawPreviewResponse;
    transformed: TransformedPreviewResponse;
}
