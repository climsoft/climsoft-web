import { JobQueueStatusEnum } from './job-queue-status.enum';

export interface JobPayloadModel {
    payLoadId: number;
    payloadType: string;
    triggeredBy: 'schedule' | 'manual';
    maximumAttempts: number;
}

export interface ViewJobQueueModel {
    id: number;
    name: string;
    payload: JobPayloadModel;
    scheduledAt: string;
    processedAt: string | null;
    status: JobQueueStatusEnum;
    attempts: number;
    errorMessage: string | null;
    entryUserId: number;
    entryDateTime: string;
}
