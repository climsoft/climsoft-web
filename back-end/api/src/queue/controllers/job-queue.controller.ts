import { Controller, Get, Param, Patch, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { JobQueueService } from '../services/job-queue.service';
import { JobQueueQueryDto } from '../dtos/job-queue-query.dto';
import { JobQueueEntity, JobQueueStatusEnum } from '../entity/job-queue.entity';
import { Between, FindManyOptions, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('job-queue')
export class JobQueueController {
    constructor(
        private readonly jobQueueService: JobQueueService,
        @InjectRepository(JobQueueEntity)
        private readonly jobQueueRepo: Repository<JobQueueEntity>,
    ) { }

    @Admin()
    @Get()
    async findAll(@Query() query: JobQueueQueryDto): Promise<JobQueueEntity[]> {
        const where = this.buildWhereClause(query);

        const options: FindManyOptions<JobQueueEntity> = {
            where,
            order: {
                scheduledAt: 'DESC',
            },
        };

        // Apply pagination
        if (query.page && query.pageSize) {
            options.skip = (query.page - 1) * query.pageSize;
            options.take = query.pageSize;
        } else if (query.pageSize) {
            options.take = query.pageSize;
        }

        return this.jobQueueRepo.find(options);
    }

    @Admin()
    @Get('count')
    async count(@Query() query: JobQueueQueryDto): Promise<number> {
        const where = this.buildWhereClause(query);
        return this.jobQueueRepo.count({ where });
    }

    @Admin()
    @Get(':id')
    async findOne(@Param('id') id: number): Promise<JobQueueEntity> {
        const job = await this.jobQueueService.getJob(id);
        if (!job) {
            throw new NotFoundException(`Job #${id} not found`);
        }
        return job;
    }

    @Admin()
    @Patch(':id/cancel')
    async cancel(@Param('id') id: number): Promise<JobQueueEntity> {
        const job = await this.jobQueueService.getJob(id);
        if (!job) {
            throw new NotFoundException(`Job #${id} not found`);
        }

        if (job.status !== JobQueueStatusEnum.PENDING && job.status !== JobQueueStatusEnum.PROCESSING) {
            throw new BadRequestException(`Job #${id} cannot be cancelled. Current status: ${job.status}`);
        }

        await this.jobQueueService.cancelJob(id);
        return this.jobQueueService.getJob(id) as Promise<JobQueueEntity>;
    }

    @Admin()
    @Patch(':id/retry')
    async retry(@Param('id') id: number): Promise<JobQueueEntity> {
        const job = await this.jobQueueService.getJob(id);
        if (!job) {
            throw new NotFoundException(`Job #${id} not found`);
        }

        if (job.status !== JobQueueStatusEnum.FAILED) {
            throw new BadRequestException(`Job #${id} cannot be retried. Current status: ${job.status}`);
        }

        const maxAttempts = job.payload?.maximumAttempts || 3;
        const success = await this.jobQueueService.retryJob(id, maxAttempts);

        if (!success) {
            throw new BadRequestException(`Job #${id} has exceeded maximum retry attempts`);
        }

        return this.jobQueueService.getJob(id) as Promise<JobQueueEntity>;
    }

    private buildWhereClause(query: JobQueueQueryDto): FindOptionsWhere<JobQueueEntity> {
        const where: FindOptionsWhere<JobQueueEntity> = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.fromDate && query.toDate) {
            where.scheduledAt = Between(new Date(query.fromDate), new Date(query.toDate));
        } else if (query.fromDate) {
            where.scheduledAt = MoreThanOrEqual(new Date(query.fromDate));
        } else if (query.toDate) {
            where.scheduledAt = LessThanOrEqual(new Date(query.toDate));
        }

        return where;
    }
}
