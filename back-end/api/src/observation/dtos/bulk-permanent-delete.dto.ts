import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class BulkPermanentDeleteFilterDto {
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
    @IsArray()
    @IsInt({ each: true })
    @Min(0, { each: true })
    @Max(23, { each: true })
    hours?: number[];

    @IsOptional()
    @IsBoolean()
    useEntryDate?: boolean;
}

export class BulkPermanentDeleteCheckDto {
    @ValidateNested()
    @Type(() => BulkPermanentDeleteFilterDto)
    filter: BulkPermanentDeleteFilterDto;
}

export class BulkPermanentDeleteExecuteDto {
    @IsString()
    @IsNotEmpty()
    sessionId: string;
}

export interface BulkPermanentDeleteCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkPermanentDeleteExecuteResponse {
    deletedCount: number;
}
