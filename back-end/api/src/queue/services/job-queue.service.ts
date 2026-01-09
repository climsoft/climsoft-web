import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { JobQueueEntity } from '../entity/job-queue.entity';
import { JobQueueStatusEnum } from '../enums/job-queue-status.enum';

@Injectable()
export class JobQueueService {
    private readonly logger = new Logger(JobQueueService.name);

    constructor(
        @InjectRepository(JobQueueEntity)
        private jobQueueRepo: Repository<JobQueueEntity>,
    ) { }

    /**
     * Create a new queue job
     */
    public async createJob(
        name: string,
        payload: any,
        scheduledAt: Date,
        userId: number
    ): Promise<JobQueueEntity> {
        const job = this.jobQueueRepo.create({
            name,
            payload,
            scheduledAt,
            status: JobQueueStatusEnum.PENDING,
            attempts: 0,
            entryUserId: userId,
        });

        return this.jobQueueRepo.save(job);
    }

    /**
     * Get pending jobs that are due to be processed
     */
    public async getPendingJobs(limit: number = 10): Promise<JobQueueEntity[]> {
        return this.jobQueueRepo.find({
            where: {
                status: JobQueueStatusEnum.PENDING,
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
        await this.jobQueueRepo.update(jobId, {
            status: JobQueueStatusEnum.PROCESSING,
        });
    }

    /**
     * Mark a job as finished
     */
    public async markAsFinished(jobId: number): Promise<void> {
        const job = await this.jobQueueRepo.findOneBy({ id: jobId });

        if (job) {
            await this.jobQueueRepo.update(jobId, {
                status: JobQueueStatusEnum.FINISHED,
                processedAt: new Date(),
                attempts: job.attempts + 1,
            });
        }
    }

    /**
     * Mark a job as failed
     */
    public async markAsFailed(jobId: number, errorMessage: string): Promise<void> {
        const job = await this.jobQueueRepo.findOneBy({ id: jobId });

        if (job) {
            await this.jobQueueRepo.update(jobId, {
                status: JobQueueStatusEnum.FAILED,
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
        const job = await this.jobQueueRepo.findOneBy({ id: jobId });

        if (!job) {
            this.logger.warn(`Job ${jobId} not found for retry`);
            return false;
        }

        if (job.attempts >= maxRetries) {
            this.logger.warn(`Job ${jobId} has exceeded max retries (${maxRetries})`);
            return false;
        }

        await this.jobQueueRepo.update(jobId, {
            status: JobQueueStatusEnum.PENDING,
            scheduledAt: new Date(Date.now() + 60000), // Retry in 1 minute
        });

        return true;
    }

    /**
     * Cancel a job
     */
    public async cancelJob(jobId: number): Promise<void> {
        await this.jobQueueRepo.update(jobId, {
            status: JobQueueStatusEnum.CANCELLED,
            processedAt: new Date(),
        });
    }

    /**
     * Get job by ID
     */
    public async getJob(jobId: number): Promise<JobQueueEntity | null> {
        return this.jobQueueRepo.findOneBy({ id: jobId });
    }

    /**
     * Clean up old finished/failed jobs
     */
    public async cleanupOldJobs(daysOld: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.jobQueueRepo.delete({
            status: JobQueueStatusEnum.FINISHED,
            processedAt: LessThan(cutoffDate),
        });

        this.logger.log(`Cleaned up ${result.affected || 0} old jobs`);
        return result.affected || 0;
    }
}
