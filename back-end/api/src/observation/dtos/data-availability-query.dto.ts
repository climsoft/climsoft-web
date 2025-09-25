import { Transform, Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export enum DurationTypeEnum {
    DAY = 'day',
    MONTH = 'month',
    YEAR = 'year',
    YEARS = 'years',
}

export class DataAvailabilityQueryDto {
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({ each: true })
    stationIds: string[];

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds: number[];

    @IsOptional()
    @IsInt()
    interval: number;

    @IsOptional()
    @IsInt()
    level?: number;

    // See issue https://github.com/typestack/class-transformer/issues/550 to know why the manual transformation is needed.
    @IsOptional()
    @Type(() => String) // Required to stop transformer from converting the value type to boolean
    @Transform(({ value }) => value ? StringUtils.mapBooleanStringToBoolean(value.toString()) : false)
    excludeConfirmedMissing?: boolean;

    @IsEnum(DurationTypeEnum, { message: 'duration must be a valid DurationTypeEnum value' })
    durationType: DurationTypeEnum;

    @IsDateString()
    fromDate: string;

    @IsDateString()
    toDate: string;




    // @IsOptional()
    // @IsString()
    // durationDaysOfMonth?: string; // 2025-01

    // @IsOptional()
    // @IsInt()
    // durationMonthsOfYear?: number; // 2025

    // @IsOptional()
    // @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    // @IsInt({ each: true })
    // durationYears?: number[]; // [2025,2024,2023]
}

