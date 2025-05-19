import { IsInt, IsOptional, IsString } from "class-validator";

export class DataAvailabilityDetailQueryDto { 
    @IsString()
    stationId: string;

    @IsInt()
    elementId: number;

    @IsInt()
    interval: number;

    @IsString()
    durationType: 'days_of_month' | 'months_of_year' | 'years';

    @IsOptional()
    @IsString()
    durationDayOfMonth: string;

    @IsOptional()
    @IsInt()
    durationMonthsOfYear: number;

    @IsOptional()
    @IsInt()
    durationYears: number;
}