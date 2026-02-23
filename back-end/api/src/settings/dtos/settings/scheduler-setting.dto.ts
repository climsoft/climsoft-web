import { Type } from "class-transformer";
import { IsInt, IsString, ValidateNested } from "class-validator";

export class CleanupScheduleDto {
    @IsString()
    cronSchedule: string;

    @IsInt()
    daysOld: number;
}

export class SchedulerSettingDto {
    @ValidateNested()
    @Type(() => CleanupScheduleDto)
    jobQueueCleanup: CleanupScheduleDto;

    @ValidateNested()
    @Type(() => CleanupScheduleDto)
    connectorLogCleanup: CleanupScheduleDto;

    @ValidateNested()
    @Type(() => CleanupScheduleDto)
    fileCleanup: CleanupScheduleDto;
}