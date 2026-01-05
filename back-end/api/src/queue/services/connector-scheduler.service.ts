import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { QueueService } from './queue.service';
import { ConnectorJobPayloadDto } from 'src/metadata/connector-specifications/dtos/connector-job-payload.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MessageQueueEntity } from '../entity/message-queue.entity';

@Injectable()
export class ConnectorSchedulerService implements OnModuleInit {
    private readonly logger = new Logger(ConnectorSchedulerService.name);

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private connectorService: ConnectorSpecificationsService,
        private queueService: QueueService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Initialize all active connector schedules when module starts
     */
    public async onModuleInit() {
        this.logger.log('Initializing connector schedules...');
        await this.initializeAllSchedules();
    }

    /**
     * Initialize all active connector schedules
     */
    private async initializeAllSchedules() {
        try {
            const connectors = await this.connectorService.findActiveConnectors();

            for (const connector of connectors) {
                await this.addConnectorSchedule(connector.id, connector.cronSchedule);
            }

            this.logger.log(`Initialized ${connectors.length} connector schedules`);
        } catch (error) {
            this.logger.error('Failed to initialize connector schedules', error);
        }
    }

    /**
     * Add a new connector schedule
     */
    public async addConnectorSchedule(connectorId: number, cronSchedule: string, timezone: string = 'UTC') {
        const jobName = `connector-${connectorId}`;

        // Remove existing job if it exists
        if (this.schedulerRegistry.doesExist('cron', jobName)) {
            this.schedulerRegistry.deleteCronJob(jobName);
        }

        try {
            const job = new CronJob(
                cronSchedule,
                async () => {
                    await this.scheduleConnectorJob(connectorId);
                },
                null,
                true,
                timezone // TODO. Check if still needed
            );

            this.schedulerRegistry.addCronJob(jobName, job);
            this.logger.log(`Scheduled connector ${connectorId} with cron: ${cronSchedule} (${timezone})`);

        } catch (error) {
            this.logger.error(`Failed to schedule connector ${connectorId}`, error);
        }
    }

    /**
     * Remove a connector schedule
     */
    public removeConnectorSchedule(connectorId: number) {
        const jobName = `connector-${connectorId}`;

        if (this.schedulerRegistry.doesExist('cron', jobName)) {
            this.schedulerRegistry.deleteCronJob(jobName);
            this.logger.log(`Removed schedule for connector ${connectorId}`);
        }
    }

    /**
     * Schedule a connector job (creates queue entry)
     */
    private async scheduleConnectorJob(connectorId: number) {
        try {
            const connector = await this.connectorService.find(connectorId, true);

            if (connector.disabled) {
                this.logger.warn(`Connector ${connectorId} is disabled, skipping`);
                return;
            }

            const payload: ConnectorJobPayloadDto = {
                connectorId: connector.id,
                connectorType: connector.connectorType,
                specificationIds: connector.specificationIds,
                triggeredBy: 'schedule',
            };

            const jobName = `connector.${connector.connectorType}`;

            // Create queue job to be processed
            await this.queueService.createJob(
                jobName,
                payload,
                new Date(), // Schedule immediately
                1 // System user ID
            );

            this.logger.log(`Created ${connector.connectorType} job for connector ${connectorId}`);

        } catch (error) {
            this.logger.error(`Failed to schedule connector job ${connectorId}`, error);
        }
    }

    /**
     * Manually trigger a connector job
     */
    public async triggerConnectorManually(connectorId: number, userId: number): Promise<MessageQueueEntity> {
        const connector = await this.connectorService.find(connectorId, true);

        const payload: ConnectorJobPayloadDto = {
            connectorId: connector.id,
            connectorType: connector.connectorType,
            specificationIds: connector.specificationIds,
            triggeredBy: 'manual'
        };

        const jobName = `connector.${connector.connectorType}`;

        const job = await this.queueService.createJob(
            jobName,
            payload,
            new Date(),
            userId
        );

        this.logger.log(`Manually triggered ${connector.connectorType} job for connector ${connectorId}`);

        return job;
    }

    /**
     * Handle connector created event
     */
    @OnEvent('connector.created')
    async handleConnectorCreated(event: any) {
        const { viewDto } = event;
        if (!viewDto.disabled) {
            await this.addConnectorSchedule(viewDto.id, viewDto.cronSchedule, viewDto.timezone);
        }
    }

    /**
     * Handle connector updated event
     */
    @OnEvent('connector.updated')
    async handleConnectorUpdated(event: any) {
        const { id, viewDto } = event;
        this.removeConnectorSchedule(id);
        if (!viewDto.disabled) {
            await this.addConnectorSchedule(viewDto.id, viewDto.cronSchedule, viewDto.timezone);
        }
    }

    /**
     * Handle connector deleted event
     */
    @OnEvent('connector.deleted')
    handleConnectorDeleted(event: any) {
        if (event.id) {
            this.removeConnectorSchedule(event.id);
        } else {
            // All connectors deleted, clear all schedules
            const cronJobs = this.schedulerRegistry.getCronJobs();
            cronJobs.forEach((_, key) => {
                if (key.startsWith('connector-')) {
                    this.schedulerRegistry.deleteCronJob(key);
                }
            });
            this.logger.log('Removed all connector schedules');
        }
    }
}
