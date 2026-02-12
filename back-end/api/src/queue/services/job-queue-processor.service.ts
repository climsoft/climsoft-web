import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobQueueService } from './job-queue.service';
import { JobQueueEntity } from '../entity/job-queue.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class JobQueueProcessorService {
    private readonly logger = new Logger(JobQueueProcessorService.name);
    private isProcessing = false;

    constructor(
        private queueService: JobQueueService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Process pending queue jobs every minute
     */
    @Cron(CronExpression.EVERY_MINUTE, { name: 'process-jobs' })
    public async processPendingJobs() {
        if (this.isProcessing) {
            this.logger.debug('Already processing jobs, skipping this cycle');
            return;
        }

        this.isProcessing = true;

        try {
            const pendingJobs = await this.queueService.getPendingJobs();

            if (pendingJobs.length > 0) {
                this.logger.log(`Processing ${pendingJobs.length} pending jobs`);

                for (const job of pendingJobs) {
                    await this.processJob(job);
                }
            }
        } catch (error) {
            this.logger.error('Error processing pending jobs', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Clean up old finished jobs daily at 3 AM
     */
    @Cron('0 3 * * *', { name: 'prune-jobs-table' })
    public async cleanupOldJobs() {
        this.logger.log('Running cleanup of old finished jobs');
        const deletedCount = await this.queueService.cleanupOldJobs(30);
        this.logger.log(`Cleaned up ${deletedCount} old jobs`);

        // TODO. Also clean up all the connector logs within the same timeframe. Including their associated files in the file system.
    }

    /**
     * Process a single job
     */
    private async processJob(job: JobQueueEntity): Promise<void> {
        this.logger.log(`Processing job ${job.id}: ${job.name}`);

        try {
            await this.queueService.markAsProcessing(job.id);

            // Emit event for job processors to handle based on job type
            await this.eventEmitter.emitAsync(job.jobType, job);

            await this.queueService.markAsFinished(job.id);

            this.logger.log(`Job ${job.id}: ${job.name} completed`);

        } catch (error) {
            this.logger.error(`Job ${job.id}: ${job.name} failed`);
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.queueService.markAsFailed(job.id, errorMessage);

            // Try to retry the job if it hasn't exceeded max retries
            await this.queueService.retryJob(job.id, job.maxAttempts);
        }
    }
}
