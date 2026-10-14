import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConnectorRunService } from './connector-run.service';
import { ConnectorRunEntity } from '../entities/connector-run.entity';
import { ConnectorSpecificationsService } from 'src/metadata/connector-specifications/services/connector-specifications.service';
import { ConnectorTypeEnum } from 'src/metadata/connector-specifications/dtos/create-connector-specification.dto';
import { ConnectorImportProcessorService } from './connector-import-processor.service';
import { ConnectorExportProcessorService } from './connector-export-processor.service';

/**
 * Starts queued connector runs, one at a time.
 *
 * A cron schedule only *queues* a run; this is what starts it. Keeping the two
 * apart is what makes a queued run self-healing — a connector whose turn came
 * while another was running is picked up on the next tick rather than being lost
 * with the cron firing that created it. Nothing else would come back for it: the
 * schedule has already fired, and a run dispatched by the previous run's
 * completion would strand every queued row the moment one process died.
 *
 * Runs are dispatched strictly one at a time. Concurrent connectors would
 * contend rather than parallelise: every transform goes through the single
 * shared DuckDB connection, which serialises statements anyway, so running two
 * connectors together halves each one's rate while doubling live operation
 * directories.
 */
@Injectable()
export class ConnectorRunDispatcherService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ConnectorRunDispatcherService.name);
    private isDispatching = false;

    constructor(
        private runService: ConnectorRunService,
        private connectorService: ConnectorSpecificationsService,
        private importProcessor: ConnectorImportProcessorService,
        private exportProcessor: ConnectorExportProcessorService,
    ) { }

    /** Recover runs a prior shutdown left mid-flight, before the first tick. */
    public async onApplicationBootstrap(): Promise<void> {
        await this.runService.requeueStaleRunning();
    }

    @Cron(CronExpression.EVERY_MINUTE, { name: 'dispatch-connector-runs' })
    public async dispatchDueRuns(): Promise<void> {
        if (this.isDispatching) {
            return;
        }
        this.isDispatching = true;

        try {
            const due: ConnectorRunEntity[] = await this.runService.findDue();
            for (const run of due) {
                await this.dispatch(run);
            }
        } catch (error) {
            this.logger.error('Error dispatching connector runs', error);
        } finally {
            this.isDispatching = false;
        }
    }

    /**
     * Start one run to completion. Errors are recorded on the run itself and
     * retried while it has attempts left, so a transient failure to reach a file
     * server does not have to wait for the next cron tick.
     */
    public async dispatch(run: ConnectorRunEntity): Promise<void> {
        let connectorType: ConnectorTypeEnum;
        try {
            connectorType = this.connectorService.find(run.connectorId, false).connectorType;
        } catch (error) {
            // The connector was deleted between queueing and dispatch. Nothing
            // to run against and nothing to retry.
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Run ${run.id} targets a connector that no longer exists; failing it. ${message}`);
            await this.runService.markFailed(run.id, `Connector ${run.connectorId} no longer exists`);
            return;
        }

        try {
            this.logger.log(`Starting run ${run.id} for connector ${run.connectorId}`);
            await this.runService.markRunning(run.id);

            await this.runProcessor(connectorType, run);

            const finished: boolean = await this.runService.markFinished(run.id);
            this.logger.log(finished
                ? `Run ${run.id} finished`
                : `Run ${run.id} stopped early — it was cancelled`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Run ${run.id} failed: ${errorMessage}`);
            await this.runService.markFailed(run.id, errorMessage);
            await this.runService.retry(run.id);
        }
    }

    /**
     * Hand the run to the processor for its direction. Exhaustive over
     * ConnectorTypeEnum — a new connector type fails to compile here rather
     * than silently running nothing.
     */
    private async runProcessor(connectorType: ConnectorTypeEnum, run: ConnectorRunEntity): Promise<void> {
        switch (connectorType) {
            case ConnectorTypeEnum.IMPORT:
                return this.importProcessor.processRun(run);
            case ConnectorTypeEnum.EXPORT:
                return this.exportProcessor.processRun(run);
            default: {
                const unhandled: never = connectorType;
                throw new Error(`Developer Error. Unsupported connector type: ${unhandled}`);
            }
        }
    }
}
