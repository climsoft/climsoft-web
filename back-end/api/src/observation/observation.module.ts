import { Module } from '@nestjs/common';
import { ObservationsController } from './controllers/observations.controller';
import { ObservationsService } from './services/observations.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservationEntity } from './entities/observation.entity';
import { ObservationImportService } from './services/observations-import.service';
import { MetadataModule } from 'src/metadata/metadata.module';
import { UserModule } from 'src/user/user.module';
import { QualityControlController } from './controllers/quality-control.controller';
import { QCTestAssessmentsService } from './services/qc-test-assessments.service';
import { SharedModule } from 'src/shared/shared.module';
import { SettingsModule } from 'src/settings/settings.module';
import { ClimsoftV4Controller } from './controllers/climsoft-v4.controller';
import { ClimsoftWebToV4SyncService } from './services/export/climsoft-v4/climsoft-web-to-v4-sync.service';
import { ObservationsExportService } from './services/export/observations-export.service';
import { ClimsoftV4WebSyncSetUpService } from './services/export/climsoft-v4/climsoft-v4-web-sync-set-up.service';
import { ClimsoftV4ToWebSyncService } from './services/export/climsoft-v4/climsoft-v4-to-web-sync.service';
import { DataEntryAndCorrectionCheckService } from './services/data-entry-corection-check.service';
import { BufrExportService } from './services/export/bufr-export.service';
import { ImportPreviewService } from './services/import-preview.service';
import { ImportPreviewController } from './controllers/import-preview.controller';

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
    ImportPreviewController,
  ],
  providers: [
    ObservationsService,
    ObservationImportService,
    DataEntryAndCorrectionCheckService,
    QCTestAssessmentsService, 
    ObservationsExportService,
    BufrExportService,
    ClimsoftV4WebSyncSetUpService,
    ClimsoftWebToV4SyncService,
    ClimsoftV4ToWebSyncService,
    ImportPreviewService,
  ],
  exports: [
    ObservationImportService,
    ObservationsExportService,
  ]
})
export class ObservationModule { }
