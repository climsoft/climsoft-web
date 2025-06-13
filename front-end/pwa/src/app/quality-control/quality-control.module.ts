
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { QualityControlRoutingModule } from './quality-control-routing.module';
import { ObservationsModule } from '../observations/observations.module';
import { SourceCheckComponent } from './source-check/source-check.component';
import { ScheduledQCTestComponent } from './scheduled-qc-test/scheduled-qc-test.component';
import { ElementQCSelectionComponent } from './element-qc-selection/element-qc-selection.component';
import { PerformQCInputDialogComponent } from './perform-qc-input-dialog/perform-qc-input-dialog.component';
import { QCDataChecksComponent } from './qc-data-checks/qc-data-checks.component';
import { DataIngestionModule } from '../data-ingestion/data-ingestion.module';

@NgModule({

  declarations: [
    SourceCheckComponent,
    ElementQCSelectionComponent,
    PerformQCInputDialogComponent,
    QCDataChecksComponent,
    ScheduledQCTestComponent,
  ],
  imports: [
    QualityControlRoutingModule,
    SharedModule,
    MetadataModule,
    ObservationsModule,
    DataIngestionModule,
  ]
})
export class QualityControlModule { }
