import { JobQueueStatusEnum, JobTypeEnum, JobTriggerEnum } from './job-queue-status.enum';

export interface ViewJobQueueModel {
    id: number;
    name: string;
    jobType: JobTypeEnum;
    triggeredBy: JobTriggerEnum;
    payload: Record<string, any>;
    scheduledAt: string;
    processedAt: string | null;
    status: JobQueueStatusEnum;
    attempts: number;
    maxAttempts: number;
    errorMessage: string | null;
    entryUserId: number;
    entryDateTime: string;
}

// Connector-specific payload interface
export interface ConnectorJobPayloadModel {
    connectorId: number;
}
