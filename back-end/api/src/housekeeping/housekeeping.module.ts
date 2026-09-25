import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { SettingsModule } from 'src/settings/settings.module';
import { MetadataModule } from 'src/metadata/metadata.module';
import { ConnectorsModule } from 'src/connectors/connectors.module';
import { CleanupSchedulerService } from './services/cleanup-scheduler.service';

/**
 * Scheduled housekeeping: pruning connector runs, and sweeping the operation,
 * adapter and sample directories that `FileIOService` owns.
 *
 * Its own module rather than a lodger in `connectors`, because only one of its
 * two sweeps is a connector concern — the file sweep collects operation
 * directories left by manual imports, adapter test runs and previews. It cannot
 * live in `shared` either: `SharedModule` is imported *by* `ConnectorsModule`, so
 * depending on `ConnectorRunService` from there would need a `forwardRef` to
 * break the cycle. Here the dependencies only point outward — housekeeping knows
 * what it cleans, and nothing it cleans knows about housekeeping.
 *
 * The two sweeps stay in one service because they are configured by one
 * settings object (`SchedulerSettingDto`), and splitting them would split reads
 * of that setting across modules.
 */
@Module({
    imports: [
        SharedModule,
        SettingsModule,
        MetadataModule,
        ConnectorsModule,
    ],
    providers: [
        CleanupSchedulerService,
    ],
})
export class HousekeepingModule { }
