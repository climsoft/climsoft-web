
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { QualityControlRoutingModule } from './quality-control-routing.module';
import { ObservationsModule } from '../observations/observations.module';
import { SourceChecksComponent } from './source-checks/source-checks.component';
import { ScheduledQCTestComponent } from './scheduled-qc-test/scheduled-qc-test.component'; 
import { QCDataChecksComponent } from './qc-data-checks/qc-data-checks.component';
import { DataIngestionModule } from '../data-ingestion/data-ingestion.module';
import { QueryQCDataChecksComponent } from './qc-data-checks/query-qc-data-checks/query-qc-data-checks.component';

@NgModule({

  declarations: [
    SourceChecksComponent,  
    QCDataChecksComponent,
    QueryQCDataChecksComponent,
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
