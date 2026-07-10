import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
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
import { AdaptersService } from 'src/metadata/adapters/services/adapters.service';
import { SourceSpecificationsService } from 'src/metadata/source-specifications/services/source-specifications.service';
import { FileIOService } from 'src/shared/services/file-io.service';

@Injectable()
export class CleanupSchedulerService implements OnApplicationBootstrap {
    private readonly logger = new Logger(CleanupSchedulerService.name);

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private generalSettingsService: GeneralSettingsService,
        private jobQueueService: JobQueueService,
        private connectorExecutionLogService: ConnectorExecutionLogService,
        private adaptersService: AdaptersService,
        private sourcesService: SourceSpecificationsService,
        private fileIOService: FileIOService,
    ) { }

    /**
     * Register cleanup cron jobs once the whole app is ready.
     * Uses onApplicationBootstrap (not onModuleInit) because the cron callbacks
     * reach back into other modules — we want every dependency fully wired up
     * before any cron can fire.
     */
    public async onApplicationBootstrap() {
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
     * Delete orphaned operation directories and unreferenced adapter script directories and sample files directories.
     * Operation directories that are still referenced by connector execution logs are preserved.
     */
    private async cleanupFiles() {
        const schedule = this.getSchedule('fileCleanup');
        if (!schedule) return;

        this.logger.log('Running file cleanup');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - schedule.daysOld);

        let totalDeleted: number = 0;

        // Clean operation directories
        totalDeleted += await this.cleanupOperations(cutoffDate);

        // Clean adapter script directories to remove unreferenced directories.
        // adapter script directories stay on disk after a spec is deleted or 
        // replaced — this is deliberate so a future sysadmin audit
        // feature can inspect recent changes within the retention window.
        // This sweep is the enforcement mechanism for that window: once a
        // directory is unreferenced AND older than the configured `daysOld`
        // cutoff, it is removed.
        const referencedScriptDirs: Set<string> = this.adaptersService.findAllReferencedScriptDirs();
        totalDeleted += await this.cleanupAdapterScriptDirs(this.fileIOService.apiAdaptersDir, referencedScriptDirs, cutoffDate);

        // Clean orphaned source-specification sample filesto remove unreferenced files.
        // Sample files stay on disk after a spec is deleted or its sample
        // is replaced — this is deliberate so a future sysadmin audit
        // feature can inspect recent changes within the retention window.
        // This sweep is the enforcement mechanism for that window: once a
        // file is unreferenced AND older than the configured `daysOld`
        // cutoff, it is removed.
        const referencedSampleFiles: Set<string> = this.sourcesService.findAllReferencedSampleFiles();
        totalDeleted += await this.cleanupSampleFiles(this.fileIOService.apiSamplesDir, referencedSampleFiles, cutoffDate);

        this.logger.log(`File cleanup completed. Deleted ${totalDeleted} unreferenced file(s)/directory(ies)`);
    }

    /**
     * Delete orphaned operation directories older than cutoffDate.
     * Skips the 'duckdb' directory and any operations still referenced
     * by connector execution logs.
     */
    private async cleanupOperations(cutoffDate: Date): Promise<number> {
        let deletedCount: number = 0;
        const operationsDir = this.fileIOService.apiOperationsDir;

        try {
            // Gather all referenced operation IDs from connector logs
            const referencedOperationIds: Set<string> = await this.connectorExecutionLogService.findAllReferencedOperationIds();

            const allEntries = await fs.promises.readdir(operationsDir, { withFileTypes: true });
            const dirs = allEntries.filter(entry => entry.isDirectory());

            for (const dir of dirs) {
                // Skip the DuckDB data directory
                if (dir.name === 'duckdb') continue;

                // Skip referenced operations
                if (referencedOperationIds.has(dir.name)) continue;

                try {
                    const dirPath = path.posix.join(operationsDir, dir.name);
                    const stats = await fs.promises.stat(dirPath);

                    if (stats.mtime < cutoffDate) {
                        await fs.promises.rm(dirPath, { recursive: true, force: true });
                        deletedCount++;
                    }
                } catch (error) {
                    this.logger.warn(`Could not delete operation dir ${dir.name}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error reading operations directory ${operationsDir}: ${error instanceof Error ? error.message : String(error)}`);
        }

        return deletedCount;
    }

    /**
     * Delete orphaned source-specification sample files older than cutoffDate.
     */
    private async cleanupSampleFiles(
        samplesDir: string,
        referencedFiles: Set<string>,
        cutoffDate: Date,
    ): Promise<number> {
        let deletedCount = 0;

        try {
            const entries = await fs.promises.readdir(samplesDir, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isFile()) continue;
                if (referencedFiles.has(entry.name)) continue;

                try {
                    const filePath = path.posix.join(samplesDir, entry.name);
                    const stats = await fs.promises.stat(filePath);

                    if (stats.mtime < cutoffDate) {
                        await fs.promises.unlink(filePath);
                        deletedCount++;
                    }
                } catch (error) {
                    this.logger.warn(`Could not delete sample file ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error reading samples directory ${samplesDir}: ${error instanceof Error ? error.message : String(error)}`);
        }

        return deletedCount;
    }

    /**
     * Delete unreferenced adapter script directories older than cutoffDate.
     */
    private async cleanupAdapterScriptDirs(
        scriptsDir: string,
        referencedDirs: Set<string>,
        cutoffDate: Date,
    ): Promise<number> {
        let deletedCount = 0;

        try {
            const allEntries = await fs.promises.readdir(scriptsDir, { withFileTypes: true });
            const dirs = allEntries.filter(entry => entry.isDirectory());

            for (const dir of dirs) {
                if (referencedDirs.has(dir.name)) {
                    continue;
                }

                try {
                    const dirPath = path.posix.join(scriptsDir, dir.name);
                    const stats = await fs.promises.stat(dirPath);

                    if (stats.mtime < cutoffDate) {
                        await fs.promises.rm(dirPath, { recursive: true, force: true });
                        deletedCount++;
                    }
                } catch (error) {
                    this.logger.warn(`Could not delete adapter dir ${dir.name}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error reading adapter scripts dir ${scriptsDir}: ${error instanceof Error ? error.message : String(error)}`);
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