import { Transform, Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional } from "class-validator";
import { JobQueueStatusEnum } from "../entity/job-queue.entity";

export class JobQueueQueryDto {
    @IsOptional()
    @IsEnum(JobQueueStatusEnum, { message: 'Status must be a valid JobQueueStatusEnum value' })
    status?: JobQueueStatusEnum;

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
