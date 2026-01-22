import { JobQueueStatusEnum, JobTypeEnum, JobTriggerEnum } from './job-queue-status.enum';

export interface JobQueueQueryModel {
    status?: JobQueueStatusEnum;
    jobType?: JobTypeEnum;
    triggeredBy?: JobTriggerEnum;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
}
