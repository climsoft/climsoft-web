import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { MessageQueueEntity } from '../entity/message-queue.entity';
import { MessageQueueStatusEnum } from '../enums/message-queue-status.enum';

@Injectable()
export class QueueService {
    private readonly logger = new Logger(QueueService.name);

    constructor(
        @InjectRepository(MessageQueueEntity)
        private queueRepo: Repository<MessageQueueEntity>,
    ) { }

    /**
     * Create a new queue job
     */
    public async createJob(
        name: string,
        payload: any,
        scheduledAt: Date,
        userId: number
    ): Promise<MessageQueueEntity> {
        const job = this.queueRepo.create({
            name,
            payload,
            scheduledAt,
            status: MessageQueueStatusEnum.PENDING,
            attempts: 0,
            entryUserId: userId,
        });

        return this.queueRepo.save(job);
    }

    /**
     * Get pending jobs that are due to be processed
     */
    public async getPendingJobs(limit: number = 10): Promise<MessageQueueEntity[]> {
        return this.queueRepo.find({
            where: {
                status: MessageQueueStatusEnum.PENDING,
                scheduledAt: LessThan(new Date()),
            },
            take: limit,
            order: {
                scheduledAt: 'ASC',
            },
        });
    }

    /**
     * Mark a job as processing
     */
    public async markAsProcessing(jobId: number): Promise<void> {
        await this.queueRepo.update(jobId, {
            status: MessageQueueStatusEnum.PROCESSING,
        });
    }

    /**
     * Mark a job as finished
     */
    public async markAsFinished(jobId: number): Promise<void> {
        await this.queueRepo.update(jobId, {
            status: MessageQueueStatusEnum.FINISHED,
            processedAt: new Date(),
        });
    }

    /**
     * Mark a job as failed
     */
    public async markAsFailed(jobId: number, errorMessage: string): Promise<void> {
        const job = await this.queueRepo.findOneBy({ id: jobId });

        if (job) {
            await this.queueRepo.update(jobId, {
                status: MessageQueueStatusEnum.FAILED,
                processedAt: new Date(),
                attempts: job.attempts + 1,
                errorMessage,
            });
        }
    }

    /**
     * Retry a failed job
     */
    public async retryJob(jobId: number, maxRetries: number): Promise<boolean> {
        const job = await this.queueRepo.findOneBy({ id: jobId });

        if (!job) {
            this.logger.warn(`Job ${jobId} not found for retry`);
            return false;
        }

        if (job.attempts >= maxRetries) {
            this.logger.warn(`Job ${jobId} has exceeded max retries (${maxRetries})`);
            return false;
        }

        await this.queueRepo.update(jobId, {
            status: MessageQueueStatusEnum.PENDING,
            scheduledAt: new Date(Date.now() + 60000), // Retry in 1 minute
        });

        return true;
    }

    /**
     * Cancel a job
     */
    public async cancelJob(jobId: number): Promise<void> {
        await this.queueRepo.update(jobId, {
            status: MessageQueueStatusEnum.CANCELLED,
            processedAt: new Date(),
        });
    }

    /**
     * Get job by ID
     */
    public async getJob(jobId: number): Promise<MessageQueueEntity | null> {
        return this.queueRepo.findOneBy({ id: jobId });
    }

    /**
     * Clean up old finished/failed jobs
     */
    public async cleanupOldJobs(daysOld: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.queueRepo.delete({
            status: MessageQueueStatusEnum.FINISHED,
            processedAt: LessThan(cutoffDate),
        });

        this.logger.log(`Cleaned up ${result.affected || 0} old jobs`);
        return result.affected || 0;
    }
}
