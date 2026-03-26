import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { BulkObservationFilterDto } from './bulk-observation-filter.dto';

export enum PkFieldEnum {
    STATION_ID = 'station_id',
    ELEMENT_ID = 'element_id',
    LEVEL = 'level',
    DATE_TIME = 'date_time',
    INTERVAL = 'interval',
    SOURCE_ID = 'source_id',
}

export enum DateTimeShiftUnitEnum {
    YEARS = 'years',
    MONTHS = 'months',
    DAYS = 'days',
    HOURS = 'hours',
}

export enum ConflictResolutionEnum {
    SKIP = 'skip',
    OVERWRITE = 'overwrite',
}

export class PkChangeSpecDto {
    @IsEnum(PkFieldEnum)
    field: PkFieldEnum;

    // For non-datetime fields: the current value to match
    @IsOptional()
    @ValidateIf(o => typeof o.fromValue === 'string')
    @IsString()
    @IsNotEmpty()
    fromValue?: string | number;

    // For non-datetime fields: the new value to set
    @IsOptional()
    @ValidateIf(o => typeof o.toValue === 'string')
    @IsString()
    @IsNotEmpty()
    toValue?: string | number;

    // For datetime shifts: positive = add, negative = subtract
    @IsOptional()
    @IsInt()
    shiftAmount?: number;

    @IsOptional()
    @IsEnum(DateTimeShiftUnitEnum)
    shiftUnit?: DateTimeShiftUnitEnum;
}

export class BulkPkUpdateCheckDto {
    @ValidateNested()
    @Type(() => BulkObservationFilterDto)
    filter: BulkObservationFilterDto;

    @ValidateNested()
    @Type(() => PkChangeSpecDto)
    change: PkChangeSpecDto;
}

export class BulkPkUpdateExecuteDto {
    @IsString()
    @IsNotEmpty()
    sessionId: string;

    @IsEnum(ConflictResolutionEnum)
    conflictResolution: ConflictResolutionEnum;
}

export interface BulkPkUpdateCheckResponse {
    sessionId: string;
    totalMatchingRows: number;
    conflictCount: number;
    permanentDeleteCount: number;
    previewData?: {
        columns: string[];
        rows: string[][];
        totalRowCount: number;
    };
}

export interface BulkPkUpdateExecuteResponse {
    updatedCount: number;
    skippedCount: number;
    permanentDeleteCount: number;
}
