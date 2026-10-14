import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { ConnectorRunService } from './connector-run.service';
import { OnEvent } from '@nestjs/event-emitter';
import { ConnectorRunEntity, ConnectorRunTriggerEnum } from '../entities/connector-run.entity';
import { ViewConnectorSpecificationModel } from 'src/metadata/connector-specifications/dtos/view-connector-specification.model';

@Injectable()
export class ConnectorSchedulerService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ConnectorSchedulerService.name);

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private connectorSpecificationService: ConnectorSpecificationsService,
        private connectorRunService: ConnectorRunService,
    ) { }

    /**
     * Initialize all active connector schedules once the whole app is ready.
     * Uses onApplicationBootstrap (not onModuleInit) because the cron callbacks
     * reach back into other modules — we want every dependency fully wired up
     * before any cron can fire.
     */
    public async onApplicationBootstrap() {
        this.logger.log('Initializing connector schedules...');
        await this.initializeAllSchedules();
    }

    /** 
     * Initialize all active connector schedules
     */
    private async initializeAllSchedules() {
        try {
            const connectors = this.connectorSpecificationService.findActiveConnectors();

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
        const jobName: string = `connector-${connectorId}`;

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
     * A cron firing only *queues* a run; the dispatcher starts it. Keeping the
     * two apart is what lets a connector whose turn came while another was
     * running be picked up on the next tick, rather than being lost along with
     * the cron firing that created it.
     */
    private async scheduleConnectorJob(connectorId: number) {
        try {
            const connector: ViewConnectorSpecificationModel = this.connectorSpecificationService.find(connectorId, false);

            if (connector.disabled) {
                this.logger.warn(`Connector ${connector.name} is disabled. Skipping`);
                return;
            }

            // `maxAttempts` counts total attempts, while a connector's
            // `retryAttempts` counts retries *after* the first try, so add one.
            // `enqueue` coalesces: a connector that already has a queued or
            // running run gets that one back, so a drain outlasting the cron
            // interval never stacks duplicates of itself.
            await this.connectorRunService.enqueue(
                connector.id,
                ConnectorRunTriggerEnum.SCHEDULE,
                connector.retryAttempts + 1,
                connector.entryUserId,
            );

        } catch (error) {
            this.logger.error(`Failed to queue run for connector ${connectorId}`, error);
        }
    }

    /**
     * Queue a run now, at a sysadmin's request. Coalesces exactly as the
     * schedule does — asking for a run while one is already going returns that
     * run rather than starting a second.
     */
    public async triggerConnectorManually(connectorId: number, userId: number): Promise<ConnectorRunEntity> {
        const connector: ViewConnectorSpecificationModel = this.connectorSpecificationService.find(connectorId);

        const run = await this.connectorRunService.enqueue(
            connector.id,
            ConnectorRunTriggerEnum.MANUAL,
            connector.retryAttempts + 1,
            userId,
        );

        this.logger.log(`Manually queued ${connector.connectorType} run ${run.id} for connector ${connector.name}`);

        return run;
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
     * Handle the dedicated enable/disable toggle. On disable we just drop the
     * cron schedule. On enable we register the cron AND enqueue an immediate
     * run so the user sees activity without waiting for the next cron tick.
     */
    @OnEvent('connector.disabledChanged')
    async handleConnectorDisabledChanged(event: { id: number; viewDto: ViewConnectorSpecificationModel }) {
        const { id, viewDto } = event;
        if (viewDto.disabled) {
            this.removeConnectorSchedule(id);
            return;
        }
        await this.addConnectorSchedule(viewDto.id, viewDto.cronSchedule);
        await this.scheduleConnectorJob(viewDto.id);
    }

    /**
     * Handle connector deleted event
     */
    @OnEvent('connector.deleted')
    async handleConnectorDeleted(event: any) {
        if (event.id) {
            // Only the schedule. The run rows are already gone:
            // connector_runs.connector_id is ON DELETE CASCADE, which Postgres
            // enforces for any DELETE of the connector however it was issued, and
            // the run tiers cascade from there.
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
