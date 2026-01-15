import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindManyOptions, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ConnectorExecutionLogEntity, ExecutionActivity } from '../entity/connector-execution-log.entity';

export interface CreateConnectorExecutionLogDto {
    connectorId: number;
    executionStartDatetime: Date;
    executionEndDatetime: Date;
    totalErrors: number;
    executionActivities: ExecutionActivity[];
    entryUserId: number;
}

export interface UpdateConnectorExecutionLogDto {
    executionStartDatetime?: Date;
    executionEndDatetime?: Date;
    totalErrors?: number;
    executionActivities?: ExecutionActivity[];
}

export interface ConnectorExecutionLogFilters {
    connectorId?: number;
    startDate?: Date;
    endDate?: Date;
    hasErrors?: boolean;
}

@Injectable()
export class ConnectorExecutionLogService {
    private readonly logger: Logger = new Logger(ConnectorExecutionLogService.name);

    constructor(
        @InjectRepository(ConnectorExecutionLogEntity)
        private executionLogRepo: Repository<ConnectorExecutionLogEntity>,
    ) { }

    /**
     * Create a new execution log entry
     */
    public async create(dto: CreateConnectorExecutionLogDto): Promise<ConnectorExecutionLogEntity> {
        const log = this.executionLogRepo.create({
            connectorId: dto.connectorId,
            executionStartDatetime: dto.executionStartDatetime,
            executionEndDatetime: dto.executionEndDatetime,
            totalErrors: dto.totalErrors,
            executionActivities: dto.executionActivities,
            entryUserId: dto.entryUserId,
        });

        const savedLog = await this.executionLogRepo.save(log);
        this.logger.log(`Created execution log ${savedLog.id} for connector ${dto.connectorId}`);
        return savedLog;
    }

    /**
   * Update an execution log
   */
    public async update(id: number, dto: UpdateConnectorExecutionLogDto): Promise<ConnectorExecutionLogEntity> {
        const log = await this.findOne(id);

        if (dto.executionStartDatetime !== undefined) {
            log.executionStartDatetime = dto.executionStartDatetime;
        }

        if (dto.executionEndDatetime !== undefined) {
            log.executionEndDatetime = dto.executionEndDatetime;
        }

        if (dto.totalErrors !== undefined) {
            log.totalErrors = dto.totalErrors;
        }

        if (dto.executionActivities !== undefined) {
            log.executionActivities = dto.executionActivities;
        }

        const updatedLog = await this.executionLogRepo.save(log);
        this.logger.log(`Updated execution log ${id}`);
        return updatedLog;
    }

    /**
     * Delete an execution log by ID
     */
    public async delete(id: number): Promise<void> {
        const log = await this.findOne(id);
        await this.executionLogRepo.remove(log);
        this.logger.log(`Deleted execution log ${id}`);
    }

    /**
     * Delete all execution logs for a specific connector
     */
    public async deleteByConnector(connectorId: number): Promise<number> {
        const logs = await this.executionLogRepo.find({
            where: { connectorId },
        });

        await this.executionLogRepo.remove(logs);
        this.logger.log(`Deleted ${logs.length} execution log(s) for connector ${connectorId}`);
        return logs.length;
    }

    /**
     * Delete execution logs older than a specified date
     */
    public async deleteOlderThan(date: Date, connectorId?: number): Promise<number> {
        const where: FindOptionsWhere<ConnectorExecutionLogEntity> = {
            entryDateTime: LessThanOrEqual(date),
        };

        if (connectorId) {
            where.connectorId = connectorId;
        }

        const logs = await this.executionLogRepo.find({ where });
        await this.executionLogRepo.remove(logs);
        this.logger.log(`Deleted ${logs.length} execution log(s) older than ${date.toISOString()}`);
        return logs.length;
    }

    /**
     * Find a single execution log by ID
     */
    public async findOne(id: number): Promise<ConnectorExecutionLogEntity> {
        const log = await this.executionLogRepo.findOneBy({ id: id });

        if (!log) {
            throw new NotFoundException(`Execution log #${id} not found`);
        }

        return log;
    }

    /**
     * Find all execution logs with optional filters
     */
    public async findAll(filters?: ConnectorExecutionLogFilters, limit?: number): Promise<ConnectorExecutionLogEntity[]> {
        const where: FindOptionsWhere<ConnectorExecutionLogEntity> = {};

        if (filters?.connectorId) {
            where.connectorId = filters.connectorId;
        }

        if (filters?.startDate && filters?.endDate) {
            where.executionStartDatetime = Between(filters.startDate, filters.endDate);
        } else if (filters?.startDate) {
            where.executionStartDatetime = MoreThanOrEqual(filters.startDate);
        } else if (filters?.endDate) {
            where.executionStartDatetime = LessThanOrEqual(filters.endDate);
        }

        const options: FindManyOptions<ConnectorExecutionLogEntity> = {
            where,
            order: {
                entryDateTime: 'DESC',
            },
        };

        if (limit) {
            options.take = limit;
        }

        let logs = await this.executionLogRepo.find(options);

        // Apply in-memory filters for hasErrors and hasWarnings
        if (filters?.hasErrors !== undefined) {
            logs = logs.filter(log => filters.hasErrors ? log.totalErrors > 0 : log.totalErrors === 0);
        }

        return logs;
    }

    /**
     * Find execution logs for a specific connector
     */
    public async findByConnector(connectorId: number, limit: number = 50): Promise<ConnectorExecutionLogEntity[]> {
        return this.findAll({ connectorId }, limit);
    }

    /**
     * Get the most recent execution log for a connector
     */
    public async findLatestByConnector(connectorId: number): Promise<ConnectorExecutionLogEntity | null> {
        const log = await this.executionLogRepo.findOne({
            where: { connectorId },
            order: {
                entryDateTime: 'DESC',
            },
        });

        return log;
    }

    /**
     * Get execution logs with errors
     */
    public async findWithErrors(connectorId?: number, limit: number = 50): Promise<ConnectorExecutionLogEntity[]> {
        return this.findAll({ connectorId, hasErrors: true }, limit);
    }

    /**
     * Get execution logs within a date range
     */
    public async findByDateRange(startDate: Date, endDate: Date, connectorId?: number): Promise<ConnectorExecutionLogEntity[]> {
        return this.findAll({ connectorId, startDate, endDate });
    }



    /**
     * Get statistics for a connector
     */
    public async getConnectorStats(connectorId: number, startDate?: Date, endDate?: Date): Promise<{
        totalExecutions: number;
        totalErrors: number;
        successfulExecutions: number;
        failedExecutions: number;
        lastExecution: Date | null;
    }> {
        const logs = await this.findAll({ connectorId, startDate, endDate });

        const stats = {
            totalExecutions: logs.length,
            totalErrors: logs.reduce((sum, log) => sum + log.totalErrors, 0),
            successfulExecutions: logs.filter(log => log.totalErrors === 0).length,
            failedExecutions: logs.filter(log => log.totalErrors > 0).length,
            lastExecution: logs.length > 0 ? logs[0].entryDateTime : null,
        };

        return stats;
    }

    /**
     * Count execution logs
     */
    public async count(filters?: ConnectorExecutionLogFilters): Promise<number> {
        const where: FindOptionsWhere<ConnectorExecutionLogEntity> = {};

        if (filters?.connectorId) {
            where.connectorId = filters.connectorId;
        }

        if (filters?.startDate && filters?.endDate) {
            where.entryDateTime = Between(filters.startDate, filters.endDate);
        } else if (filters?.startDate) {
            where.entryDateTime = MoreThanOrEqual(filters.startDate);
        } else if (filters?.endDate) {
            where.entryDateTime = LessThanOrEqual(filters.endDate);
        }

        return this.executionLogRepo.count({ where });
    }

    /**
     * Check if a connector has recent executions (within last N minutes)
     */
    public async hasRecentExecution(connectorId: number, minutesAgo: number): Promise<boolean> {
        const thresholdDate = new Date(Date.now() - minutesAgo * 60 * 1000);

        const count = await this.executionLogRepo.count({
            where: {
                connectorId,
                entryDateTime: MoreThanOrEqual(thresholdDate),
            },
        });

        return count > 0;
    }
}
