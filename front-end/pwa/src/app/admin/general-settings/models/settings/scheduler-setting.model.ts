
export interface CleanupScheduleModel {
    cronSchedule: string;
    daysOld: number;
}

export interface SchedulerSettingModel {
    jobQueueCleanup: CleanupScheduleModel;
    connectorLogCleanup: CleanupScheduleModel;
    fileCleanup: CleanupScheduleModel;
}
