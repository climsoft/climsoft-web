import { ArrayNotEmpty, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class BulkObservationFilterDto {
    @IsOptional()
    @ArrayNotEmpty()
    @IsString({ each: true })
    stationIds?: string[];

    @IsOptional()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    elementIds?: number[];

    @IsOptional()
    @IsInt()
    @Min(0)
    level?: number;

    @IsOptional()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    intervals?: number[];

    @IsOptional()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    sourceIds?: number[];

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    @Min(0, { each: true })
    @Max(23, { each: true })
    hours?: number[];

    @IsOptional()
    @IsBoolean()
    useEntryDate?: boolean;
}
