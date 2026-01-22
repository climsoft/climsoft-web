import { Controller, Get, Delete, Param, Query, ParseIntPipe, ParseDatePipe } from '@nestjs/common';
import { Admin } from 'src/user/decorators/admin.decorator';
import { ConnectorExecutionLogService, ConnectorExecutionLogFilters } from '../services/connector-execution-log.service';
import { ConnectorExecutionLogQueryDto } from '../dtos/connector-execution-log-query.dto';
import { ConnectorExecutionLogEntity } from '../entity/connector-execution-log.entity';

@Controller('connector-execution-logs')
export class ConnectorExecutionLogsController {
    constructor(
        private readonly executionLogService: ConnectorExecutionLogService,
    ) { }

    @Admin()
    @Get()
    async findAll(@Query() query: ConnectorExecutionLogQueryDto): Promise<ConnectorExecutionLogEntity[]> {
        const filters = this.buildFilters(query);

        // Get all logs with filters
        let logs = await this.executionLogService.findAll(filters);

        // Apply pagination manually since the service doesn't support offset
        if (query.page && query.pageSize) {
            const startIndex = (query.page - 1) * query.pageSize;
            logs = logs.slice(startIndex, startIndex + query.pageSize);
        } else if (query.pageSize) {
            logs = logs.slice(0, query.pageSize);
        }

        return logs;
    }

    @Admin()
    @Get('count')
    async count(@Query() query: ConnectorExecutionLogQueryDto): Promise<number> {
        const filters = this.buildFilters(query);

        // If hasErrors filter is set, we need to count after filtering
        if (query.hasErrors !== undefined) {
            const logs = await this.executionLogService.findAll(filters);
            return logs.length;
        }

        return this.executionLogService.count(filters);
    }

    @Admin()
    @Get('stats')
    async getStats(
        @Query('connectorId', ParseIntPipe) connectorId: number,
        @Query('startDate', new ParseDatePipe({ optional: true })) startDate?: Date,
        @Query('endDate', new ParseDatePipe({ optional: true })) endDate?: Date,
    ): Promise<{
        totalExecutions: number;
        totalErrors: number;
        successfulExecutions: number;
        failedExecutions: number;
        lastExecution: Date | null;
    }> {
        return this.executionLogService.getConnectorStats(
            connectorId,
            startDate,
            endDate,
        );
    }

    @Admin()
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ConnectorExecutionLogEntity> {
        return this.executionLogService.findOne(id);
    }

    @Admin()
    @Delete(':id')
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.executionLogService.delete(id);
    }

    private buildFilters(query: ConnectorExecutionLogQueryDto): ConnectorExecutionLogFilters {
        const filters: ConnectorExecutionLogFilters = {};

        if (query.connectorId) {
            filters.connectorId = query.connectorId;
        }

        if (query.startDate) {
            filters.startDate = new Date(query.startDate);
        }

        if (query.endDate) {
            filters.endDate = new Date(query.endDate);
        }

        if (query.hasErrors !== undefined) {
            filters.hasErrors = query.hasErrors;
        }

        return filters;
    }
}
