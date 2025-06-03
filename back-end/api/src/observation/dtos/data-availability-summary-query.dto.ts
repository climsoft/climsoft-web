import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class DataAvailabilitySummaryQueryDto {
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({ each: true })
    stationIds: string[];

    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds: number[];

    @IsInt()
    interval: number;

    @IsString()
    durationType: 'days_of_month' | 'months_of_year' | 'years';

    @IsOptional()
    @IsString()
    durationDaysOfMonth: string; // 2025-01

    @IsOptional()
    @IsInt()
    durationMonthsOfYear: number; // 2025

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({ each: true })
    durationYears: number[]; // [2025,2024,2023]
}