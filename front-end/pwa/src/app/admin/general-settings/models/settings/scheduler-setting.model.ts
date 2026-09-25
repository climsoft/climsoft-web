
export interface FileCleanupScheduleModel {
    cronSchedule: string;
    daysOld: number;
}

/**
 * Connector run retention. Two rules, because the table holds two kinds of row —
 * mirrors ConnectorRunCleanupDto on the API.
 *
 * Runs that reached the server are kept by *count*, not age: each one records
 * the full state of the file server it points at, so what costs storage is the
 * number of snapshots, and the same time window means wildly different numbers
 * depending on the schedule — a day is 24 snapshots for an hourly connector and
 * one for a daily one.
 *
 * Runs that never reached the server hold nothing and are kept by age instead,
 * purely so a sysadmin can still see that a connector has been failing.
 */
export interface ConnectorRunCleanupModel {
    cronSchedule: string;
    /**
     * Snapshots kept per connector, newest first. Never below 1: the newest one
     * is the de-duplication baseline the next run reads, so deleting it makes
     * the connector re-ingest everything still visible on the server.
     */
    keepLast: number;
    /** Days to keep runs that never reached the server. */
    attemptDays: number;
}

export interface SchedulerSettingModel {
    connectorRunCleanup: ConnectorRunCleanupModel;
    fileCleanup: FileCleanupScheduleModel;
}
