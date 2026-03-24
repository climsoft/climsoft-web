import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class BulkDeleteFilterDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    stationIds?: string[];

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    elementIds?: number[];

    @IsOptional()
    @IsInt()
    @Min(0)
    level?: number;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    intervals?: number[];

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    sourceIds?: number[];

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(23)
    hour?: number;
}

export class BulkDeleteCheckDto {
    @ValidateNested()
    @Type(() => BulkDeleteFilterDto)
    filter: BulkDeleteFilterDto;
}

export class BulkDeleteExecuteDto {
    @IsString()
    @IsNotEmpty()
    sessionId: string;
}

export interface BulkDeleteCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkDeleteExecuteResponse {
    deletedCount: number;
}
