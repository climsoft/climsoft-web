import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from './queue.service';
import { MessageQueueEntity } from '../entity/message-queue.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class QueueProcessorService {
    private readonly logger = new Logger(QueueProcessorService.name);
    private isProcessing = false;

    constructor(
        private queueService: QueueService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Process pending queue jobs every minute
     */
    @Cron(CronExpression.EVERY_MINUTE)
    public async processPendingJobs() {
        if (this.isProcessing) {
            this.logger.debug('Already processing jobs, skipping this cycle');
            return;
        }

        this.isProcessing = true;

        try {
            const pendingJobs = await this.queueService.getPendingJobs(10);

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
    @Cron('0 3 * * *')
    public async cleanupOldJobs() {
        this.logger.log('Running cleanup of old finished jobs');
        const deletedCount = await this.queueService.cleanupOldJobs(30);
        this.logger.log(`Cleaned up ${deletedCount} old jobs`);
    }

    /**
     * Process a single job
     */
    private async processJob(job: MessageQueueEntity): Promise<void> {
        this.logger.log(`Processing job ${job.id}: ${job.name}`);

        try {
            await this.queueService.markAsProcessing(job.id);

            // Emit event for job processors to handle
            await this.eventEmitter.emitAsync(`queue.${job.name}`, job);

            await this.queueService.markAsFinished(job.id);
            this.logger.log(`Job ${job.id} completed successfully`);

        } catch (error) {
            this.logger.error(`Job ${job.id} failed:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.queueService.markAsFailed(job.id, errorMessage);

            // Try to retry the job if it hasn't exceeded max retries
            // Get the retries from connector spec if available, otherwise default to 3
            const maxRetries = 3; // TODO: Get from connector specification
            await this.queueService.retryJob(job.id, maxRetries);
        }
    }
}
