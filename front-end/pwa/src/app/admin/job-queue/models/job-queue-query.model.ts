import { JobQueueStatusEnum } from './job-queue-status.enum';

export interface JobQueueQueryModel {
    status?: JobQueueStatusEnum;
    name?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
}
