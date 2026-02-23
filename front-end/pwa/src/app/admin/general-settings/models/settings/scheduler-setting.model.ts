import { SettingsParametersValidity } from "../update-general-setting.model";

export interface CleanupScheduleModel {
    cronSchedule: string;
    daysOld: number;
}

export interface SchedulerSettingModel extends SettingsParametersValidity {
    jobQueueCleanup: CleanupScheduleModel;
    connectorLogCleanup: CleanupScheduleModel;
    fileCleanup: CleanupScheduleModel;
}
