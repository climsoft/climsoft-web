import { Module } from '@nestjs/common';
import { ObservationsController } from './controllers/observations.controller';
import { ObservationsService } from './services/observations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './entities/observation.entity';
import { ObservationImportService } from './services/observation-import.service';
import { MetadataModule } from 'src/metadata/metadata.module';
import { UserModule } from 'src/user/user.module';
import { SourceCheckController } from './controllers/source-check.controller';
import { SourceCheckService } from './services/source-check.service';
import { SharedModule } from 'src/shared/shared.module';
import { SettingsModule } from 'src/settings/settings.module'; 
import { ClimsoftV4Controller } from './controllers/climsoft-v4.controller';
import { ClimsoftV5ToV4SyncService } from './services/climsoft-v5-to-v4-sync.service';
import { ExportObservationsService } from './services/export-observations.service';
import { ClimsoftV4V5SyncSetUpService } from './services/climsoft-v4-v5-sync-set-up.service';
import { ClimsoftV4ToV5SyncService } from './services/climsoft-v4-to-v5-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ObservationEntity]),
    SharedModule,
    UserModule,
    MetadataModule,
    SettingsModule, 
  ],
  controllers: [
    ObservationsController,
    SourceCheckController,
    ClimsoftV4Controller,
  ],
  providers: [
    ObservationsService,
    ObservationImportService,
    SourceCheckService,
    ExportObservationsService,
    ClimsoftV4V5SyncSetUpService,
    ClimsoftV5ToV4SyncService,
    ClimsoftV4ToV5SyncService,
  ],
})
export class ObservationModule { }
