import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { JobQueueService } from './job-queue.service';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectorJobPayloadDto, JobQueueEntity, JobTriggerEnum, JobTypeEnum } from '../entity/job-queue.entity';
import { ViewConnectorSpecificationDto } from 'src/metadata/connector-specifications/dtos/view-connector-specification.dto';
import { ConnectorTypeEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';

@Injectable()
export class ConnectorSchedulerService implements OnModuleInit {
    private readonly logger = new Logger(ConnectorSchedulerService.name);

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private connectorSpecificationService: ConnectorSpecificationsService,
        private jobQueueService: JobQueueService,
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
            const connectors = await this.connectorSpecificationService.findActiveConnectors();

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
    private async addConnectorSchedule(connectorId: number, connectorCronSchedule: string) {
        const jobName = `connector-${connectorId}`;

        // Remove existing job if it exists
        if (this.schedulerRegistry.doesExist('cron', jobName)) {
            this.schedulerRegistry.deleteCronJob(jobName);
        }

        try {
            const job = new CronJob(
                connectorCronSchedule,
                async () => {
                    await this.scheduleConnectorJob(connectorId);
                },
                null, // on complete
                true, // Start immediately
                'UTC', // Timezone
            );

            this.schedulerRegistry.addCronJob(jobName, job);
            this.logger.log(`Scheduled connector ${connectorId} with cron: ${connectorCronSchedule}`);

        } catch (error) {
            this.logger.error(`Failed to schedule connector ${connectorId}`, error);
        }
    }

    /**
     * Remove a connector schedule
     */
    private removeConnectorSchedule(connectorId: number) {
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
            const connector = await this.connectorSpecificationService.find(connectorId);

            if (connector.disabled) {
                this.logger.warn(`Connector ${connectorId} is disabled, skipping`);
                return;
            }

            const payload: ConnectorJobPayloadDto = {
                connectorId: connector.id,
            };

            const jobType: JobTypeEnum = this.getEquivalentJobType(connector.connectorType);

            // Create queue job to be processed
            await this.jobQueueService.createJob(
                connector.name,
                jobType,
                JobTriggerEnum.SCHEDULE,
                connector.maxAttempts,
                payload,
                new Date(), // Schedule immediately
                connector.entryUserId, // User who created it
            );

            this.logger.log(`Created ${connector.connectorType} job for connector ${connector.name}`);

        } catch (error) {
            this.logger.error(`Failed to schedule connector job ${connectorId}`, error);
        }
    }

    private getEquivalentJobType(connectorType: ConnectorTypeEnum): JobTypeEnum {
        switch (connectorType) {
            case ConnectorTypeEnum.IMPORT:
                return JobTypeEnum.CONNECTOR_IMPORT;
            case ConnectorTypeEnum.EXPORT:
                return JobTypeEnum.CONNECTOR_IMPORT;
            default:
                throw new Error('Developer Error. Connector type not supported');
        }
    }

    /**
     * Manually trigger a connector job
     */
    public async triggerConnectorManually(connectorId: number, userId: number): Promise<JobQueueEntity> {
        const connector: ViewConnectorSpecificationDto = await this.connectorSpecificationService.find(connectorId);

        const payload: ConnectorJobPayloadDto = {
            connectorId: connector.id,
        };

        const jobType: JobTypeEnum = this.getEquivalentJobType(connector.connectorType);

        const job = await this.jobQueueService.createJob(
            connector.name,
            jobType,
            JobTriggerEnum.MANUAL,
            connector.maxAttempts,
            payload,
            new Date(),
            userId
        );

        this.logger.log(`Manually triggered ${connector.connectorType} job for connector ${connector.name}`);

        return job;
    }

    /**
     * Handle connector created event
     */
    @OnEvent('connector.created')
    async handleConnectorCreated(event: any) {
        const { viewDto } = event;
        if (!viewDto.disabled) {
            await this.addConnectorSchedule(viewDto.id, viewDto.cronSchedule);
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
            await this.addConnectorSchedule(viewDto.id, viewDto.cronSchedule);
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
