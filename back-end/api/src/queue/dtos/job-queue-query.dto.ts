import { Transform, Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional } from "class-validator";
import { JobQueueStatusEnum, JobTypeEnum, JobTriggerEnum } from "../entity/job-queue.entity";

export class JobQueueQueryDto {
    @IsOptional()
    @IsEnum(JobQueueStatusEnum, { message: 'Status must be a valid JobQueueStatusEnum value' })
    status?: JobQueueStatusEnum;

    @IsOptional()
    @IsEnum(JobTypeEnum, { message: 'Job type must be a valid JobTypeEnum value' })
    jobType?: JobTypeEnum;

    @IsOptional()
    @IsEnum(JobTriggerEnum, { message: 'Triggered by must be a valid JobTriggerEnum value' })
    triggeredBy?: JobTriggerEnum;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    pageSize?: number;
}
