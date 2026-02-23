import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { IsCron } from "src/shared/validators/is-cron.validator";

export class CleanupScheduleDto {
    @IsString()
    @IsNotEmpty()
    @IsCron()
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