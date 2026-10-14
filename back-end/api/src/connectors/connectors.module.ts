import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/user/user.module';
import { ConnectorSchedulerService } from './services/connector-scheduler.service';
import { ConnectorRunDispatcherService } from './services/connector-run-dispatcher.service';
import { ConnectorImportProcessorService } from './services/connector-import-processor.service';
import { ConnectorExportProcessorService } from './services/connector-export-processor.service';
import { MetadataModule } from 'src/metadata/metadata.module';
import { ObservationModule } from 'src/observation/observation.module';
import { ConnectorRunEntity } from './entities/connector-run.entity';
import { ConnectorRunService } from './services/connector-run.service';
import { ConnectorRunFileEntity } from './entities/connector-run-file.entity';
import { ConnectorRunFileService } from './services/connector-run-file.service';
import { ConnectorRunSpecEntity } from './entities/connector-run-spec.entity';
import { ConnectorRunSpecService } from './services/connector-run-spec.service';
import { ConnectorRunsController } from './controllers/connector-runs.controller';
import { SettingsModule } from 'src/settings/settings.module';

/**
 * Connector execution: scheduling a connector's runs, dispatching them, and
 * carrying out the imports and exports themselves.
 *
 * The *configuration* side lives in `metadata/connector-specifications` — the
 * same split as `metadata/source-specifications` (import config) against
 * `observation` (import execution).
 *
 * This module was called `queue` while it was built around a generic
 * `job_queues` table that could have served alerts and QC as well. Superset took
 * those over, the table merged into `connector_runs`, and nothing generic was
 * left to justify the name.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            ConnectorRunEntity,
            ConnectorRunFileEntity,
            ConnectorRunSpecEntity,
        ]),
        SharedModule,
        UserModule,
        SettingsModule,
        MetadataModule,
        ObservationModule,
    ],
    controllers: [
        ConnectorRunsController,
    ],
    providers: [
        ConnectorSchedulerService,
        ConnectorRunDispatcherService,
        ConnectorRunService,
        ConnectorRunFileService,
        ConnectorRunSpecService,
        ConnectorImportProcessorService,
        ConnectorExportProcessorService,
    ],
    exports: [
        // Consumed by HousekeepingModule's retention and orphan sweeps.
        ConnectorRunService,
        ConnectorRunFileService,
        ConnectorSchedulerService,
    ],
})
export class ConnectorsModule { }
