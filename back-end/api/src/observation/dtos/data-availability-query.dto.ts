import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { StringUtils } from "src/shared/utils/string.utils";

export class DataAvailabilityQueryDto {
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsString({ each: true })
    stationIds: string[];

    @IsInt()
    elementId: number;

    @IsInt()
    interval: number;

    @IsString()
    durationType: 'days_of_month' | 'months_of_year' | 'years';

    @IsOptional()
    @IsString()
    durationDaysOfMonth: string;

    @IsOptional()
    @IsInt()
    durationMonthsOfYear: number;

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToIntArray(value.toString()) : [])
    @IsInt({ each: true })
    durationYears: number[];
}