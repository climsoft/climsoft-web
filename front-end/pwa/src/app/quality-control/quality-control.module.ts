
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { QualityControlRoutingModule } from './quality-control-routing.module';
import { ObservationsModule } from '../observations/observations.module';
import { SourceChecksComponent } from './source-checks/source-checks.component';
import { QCAssessmentComponent } from './qc-data-checks/qc-assessment.component';
import { DataIngestionModule } from '../data-ingestion/data-ingestion.module';
import { QueryQCDataChecksComponent } from './qc-data-checks/query-qc-data-checks/query-qc-data-checks.component';
import { PerformQCDialogComponent } from './qc-data-checks/perform-qc-dialog/perform-qc-dialog.component';

@NgModule({

  declarations: [
    SourceChecksComponent,
    QCAssessmentComponent,
    PerformQCDialogComponent,
    QueryQCDataChecksComponent,
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
