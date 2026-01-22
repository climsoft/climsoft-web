export enum JobQueueStatusEnum {
    PENDING = 'pending',
    PROCESSING = 'processing',
    FINISHED = 'finished',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export enum JobTypeEnum {
    CONNECTOR_IMPORT = 'connector.import',
    CONNECTOR_EXPORT = 'connector.export'
}

export enum JobTriggerEnum {
    SCHEDULE = 'schedule',
    MANUAL = 'manual'
}
