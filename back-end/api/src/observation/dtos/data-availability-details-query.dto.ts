import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsDateString, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class DataAvailabilityDetailsQueryDto {
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @ArrayNotEmpty()
    @IsString({ each: true })
    stationIds?: string[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @ArrayNotEmpty()
    @IsInt({ each: true })
    elementIds?: number[];

    @IsInt()
    interval?: number;

    @IsOptional()
    @IsInt()
    level?: number;

    @IsDateString()
    fromDate: string;

    @IsDateString()
    toDate: string;
}

