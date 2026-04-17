import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { CronJob } from 'cron';
import fs from 'node:fs';
import path from 'node:path';
import { GeneralSettingsService } from 'src/settings/services/general-settings.service';
import { SettingIdEnum } from 'src/settings/dtos/setting-id.enum';
import { CleanupScheduleDto, SchedulerSettingDto } from 'src/settings/dtos/settings/scheduler-setting.dto';
import { JobQueueService } from './job-queue.service';
import { ConnectorExecutionLogService } from './connector-execution-log.service';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { FileIOService } from 'src/shared/services/file-io.service';

@Injectable()
export class CleanupSchedulerService implements OnModuleInit {
    private readonly logger = new Logger(CleanupSchedulerService.name);

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private generalSettingsService: GeneralSettingsService,
        private jobQueueService: JobQueueService,
        private connectorExecutionLogService: ConnectorExecutionLogService,
        private sourceSpecificationsService: SourceSpecificationsService,
        private fileIOService: FileIOService,
    ) { }

    public async onModuleInit() {
        this.logger.log('Initializing cleanup schedules...');
        await this.initializeCleanupSchedules();
    }

    /**
     * Handle setting updated event — re-register cleanup crons if the Scheduler setting changed
     */
    @OnEvent('setting.updated')
    async handleSettingUpdated(event: { id: SettingIdEnum }) {
        if (event.id === SettingIdEnum.SCHEDULER) {
            this.logger.log('Scheduler setting updated. Re-initializing cleanup schedules...');
            this.removeAllCleanupCrons();
            await this.initializeCleanupSchedules();
        }
    }

    private removeAllCleanupCrons() {
        const cronNames = ['cleanup-job-queue', 'cleanup-connector-logs', 'cleanup-files'];
        for (const name of cronNames) {
            if (this.schedulerRegistry.doesExist('cron', name)) {
                this.schedulerRegistry.deleteCronJob(name);
            }
        }
    }

    private async initializeCleanupSchedules() {
        let schedulerSetting: SchedulerSettingDto;

        try {
            schedulerSetting = this.generalSettingsService.findOne(SettingIdEnum.SCHEDULER).parameters as SchedulerSettingDto;
        } catch (error) {
            this.logger.warn('Scheduler setting not found. Cleanup schedules will not be registered.');
            return;
        }

        if (schedulerSetting.jobQueueCleanup) {
            this.registerCronJob('cleanup-job-queue', schedulerSetting.jobQueueCleanup, () => this.cleanupJobQueue());
        }

        if (schedulerSetting.connectorLogCleanup) {
            this.registerCronJob('cleanup-connector-logs', schedulerSetting.connectorLogCleanup, () => this.cleanupConnectorLogs());
        }

        if (schedulerSetting.fileCleanup) {
            this.registerCronJob('cleanup-files', schedulerSetting.fileCleanup, () => this.cleanupFiles());
        }

        this.logger.log('Cleanup schedules initialized');
    }

    private registerCronJob(jobName: string, schedule: CleanupScheduleDto, callback: () => Promise<void>) {
        if (this.schedulerRegistry.doesExist('cron', jobName)) {
            this.schedulerRegistry.deleteCronJob(jobName);
        }

        try {
            const job = new CronJob(
                schedule.cronSchedule,
                async () => {
                    try {
                        await callback();
                    } catch (error) {
                        this.logger.error(`Error executing ${jobName}`, error);
                    }
                },
                null,
                true,
                'UTC',
            );

            this.schedulerRegistry.addCronJob(jobName, job);
            this.logger.log(`Scheduled ${jobName} with cron: ${schedule.cronSchedule}, daysOld: ${schedule.daysOld}`);
        } catch (error) {
            this.logger.error(`Failed to schedule ${jobName}`, error);
        }
    }

    /**
     * Delete finished job queue entries older than the configured daysOld
     */
    private async cleanupJobQueue() {
        const schedule = this.getSchedule('jobQueueCleanup');
        if (!schedule) return;

        this.logger.log('Running job queue cleanup');
        const deletedCount = await this.jobQueueService.cleanupOldJobs(schedule.daysOld);
        this.logger.log(`Job queue cleanup completed. Deleted ${deletedCount} old job(s)`);
    }

    /**
     * Delete connector execution logs older than the configured daysOld
     */
    private async cleanupConnectorLogs() {
        const schedule = this.getSchedule('connectorLogCleanup');
        if (!schedule) return;

        this.logger.log('Running connector log cleanup');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - schedule.daysOld);

        const deletedCount = await this.connectorExecutionLogService.deleteOlderThan(cutoffDate);
        this.logger.log(`Connector log cleanup completed. Deleted ${deletedCount} old log(s)`);
    }

    /**
     * Delete files in import/export directories that are not referenced by any
     * connector execution log or source specification and are older than the configured daysOld
     */
    private async cleanupFiles() {
        const schedule = this.getSchedule('fileCleanup');
        if (!schedule) return;

        this.logger.log('Running file cleanup');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - schedule.daysOld);

        // Gather all referenced file names
        const referencedByLogs = await this.connectorExecutionLogService.findAllReferencedFileNames();
        const referencedBySpecs = this.sourceSpecificationsService.findAllReferencedSampleFiles();
        const referencedFiles = new Set([...referencedByLogs, ...referencedBySpecs]);

        let totalDeleted = 0;

        // Clean import directory
        totalDeleted += await this.cleanupDirectory(
            this.fileIOService.apiImportsDir,
            referencedFiles,
            cutoffDate,
            (fileName) => fileName !== 'duckdb',
        );

        // Clean export directory
        totalDeleted += await this.cleanupDirectory(
            this.fileIOService.apiExportsDir,
            referencedFiles,
            cutoffDate,
        );

        this.logger.log(`File cleanup completed. Deleted ${totalDeleted} unreferenced file(s)`);
    }

    /**
     * Delete unreferenced files older than cutoffDate from a directory
     */
    private async cleanupDirectory(
        directory: string,
        referencedFiles: Set<string>,
        cutoffDate: Date,
        fileFilter?: (fileName: string) => boolean,
    ): Promise<number> {
        let deletedCount = 0;

        try {
            const allEntries = await fs.promises.readdir(directory, { withFileTypes: true });
            // Only process files, not directories
            const files = allEntries.filter(entry => entry.isFile());

            for (const file of files) {
                if (fileFilter && !fileFilter(file.name)) {
                    continue;
                }

                if (referencedFiles.has(file.name)) {
                    continue;
                }

                try {
                    const filePath = path.posix.join(directory, file.name);
                    const stats = await fs.promises.stat(filePath);

                    if (stats.mtime < cutoffDate) {
                        await fs.promises.unlink(filePath);
                        deletedCount++;
                    }
                } catch (error) {
                    this.logger.warn(`Could not delete file ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error reading directory ${directory}: ${error instanceof Error ? error.message : String(error)}`);
        }

        return deletedCount;
    }

    /**
     * Read a specific cleanup schedule from the current Scheduler setting
     */
    private getSchedule(key: keyof Pick<SchedulerSettingDto, 'jobQueueCleanup' | 'connectorLogCleanup' | 'fileCleanup'>): CleanupScheduleDto | null {
        try {
            const setting = this.generalSettingsService.findOne(SettingIdEnum.SCHEDULER).parameters as SchedulerSettingDto;
            return setting[key] ?? null;
        } catch (error) {
            this.logger.warn(`Could not read scheduler setting for ${key}`);
            return null;
        }
    }
}