import { Module } from '@nestjs/common';
import { ObservationsController } from './controllers/observations.controller';
import { ObservationsService } from './services/observations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './entities/observation.entity';
import { ObservationImportService } from './services/observation-import.service';
import { MetadataModule } from 'src/metadata/metadata.module';
import { UserModule } from 'src/user/user.module';
import { QualityControlController } from './controllers/quality-control.controller';
import { QCTestsService } from './services/qc-tests.service';
import { SharedModule } from 'src/shared/shared.module';
import { SettingsModule } from 'src/settings/settings.module';
import { ClimsoftV4Controller } from './controllers/climsoft-v4.controller';
import { ClimsoftWebToV4SyncService } from './services/climsoft-web-to-v4-sync.service';
import { ExportObservationsService } from './services/export-observations.service';
import { ClimsoftV4WebSyncSetUpService } from './services/climsoft-v4-web-sync-set-up.service';
import { ClimsoftV4ToWebSyncService } from './services/climsoft-v4-to-web-sync.service';
import { DataEntryCheckService } from './services/data-entry-check.service'; 

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
    QualityControlController,
    ClimsoftV4Controller,
  ],
  providers: [
    ObservationsService,
    ObservationImportService,
    DataEntryCheckService,
    QCTestsService, 
    ExportObservationsService,
    ClimsoftV4WebSyncSetUpService,
    ClimsoftWebToV4SyncService,
    ClimsoftV4ToWebSyncService,
  ],
})
export class ObservationModule { }
