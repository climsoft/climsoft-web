import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, Min, ValidateNested } from "class-validator";
import { IsCron } from "src/shared/validators/is-cron.validator";

export class FileCleanupScheduleDto {
    @IsString()
    @IsNotEmpty()
    @IsCron()
    cronSchedule!: string;

    @IsInt()
    daysOld!: number;
}

/**
 * Connector run retention. Two rules, because the table holds two kinds of row.
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
export class ConnectorRunCleanupDto {
    @IsString()
    @IsNotEmpty()
    @IsCron()
    cronSchedule!: string;

    /**
     * Snapshots kept per connector, newest first. Must be at least 1: the newest
     * one is the de-duplication baseline the next run reads, so deleting it
     * makes the connector re-ingest everything still visible on the server.
     *
     * Only runs that actually established what was on the server count towards
     * this. Failed attempts must not, or a night of connection failures would
     * push the last real snapshot out of the window and take the baseline with
     * it.
     */
    @IsInt()
    @Min(1)
    keepLast!: number;

    /** Days to keep runs that never reached the server. */
    @IsInt()
    @Min(1)
    attemptDays!: number;
}

export class SchedulerSettingDto {
    // Safe to automate because de-duplication lives only in a connector's NEWEST
    // successful run: every older one is history, so pruning cannot affect what
    // the next run ingests. This also absorbed the old job-queue cleanup, since
    // a connector run is now its own queue entry.
    @ValidateNested()
    @Type(() => ConnectorRunCleanupDto)
    connectorRunCleanup!: ConnectorRunCleanupDto;

    @ValidateNested()
    @Type(() => FileCleanupScheduleDto)
    fileCleanup!: FileCleanupScheduleDto;
}