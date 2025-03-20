
import { NgModule } from '@angular/core';
import { ImportEntryComponent } from './import-entry/import-entry.component';
import { StationFormSelectionComponent } from './station-form-selection/station-form-selection.component';
import { FormEntryComponent } from './form-entry/form-entry.component';
import { UserFormSettingsComponent } from './form-entry/user-form-settings/user-form-settings.component';
import { GridLayoutComponent } from './form-entry/grid-layout/grid-layout.component';
import { LnearLayoutComponent } from './form-entry/linear-layout/linear-layout.component';
import { ValueFlagInputComponent } from './form-entry/value-flag-input/value-flag-input.component';
import { AssignSameInputComponent } from './form-entry/assign-same-input/assign-same-input.component';
import { ImportSelectionComponent } from './import-selection/import-selection.component';
import { DataCorrectionComponent } from './data-correction/data-correction.component';
import { QCDataComponent } from './manage-qc-data/qc-data/qc-data.component';
import { EditQCDataComponent } from './manage-qc-data/edit-qc-data/edit-qc-data.component';
import { SourceCheckComponent } from './manage-qc-data/source-check/source-check.component';
import { MissingDataComponent } from './manage-qc-data/missing-data/missing-data.component';
import { DeletedDataComponent } from './deleted-data/deleted-data.component';
import { AutoImportSelectionComponent } from './auto-import-selection/auto-import-selection.component';
import { ManageQCComponent } from './manage-qc-data/manage-qc.component';
import { DataIngestionRoutingModule } from './data-ingestion-routing.module';
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { DataMonitoringComponent } from './data-monitoring/data-monitoring.component';
import { StationDataMonitoringComponent } from './data-monitoring/station-data-monitoring/station-data-monitoring.component';
import { QuerySelectionComponent } from './query-selection/query-selection.component';


@NgModule({

  declarations: [
    ImportEntryComponent,
    StationFormSelectionComponent,
    FormEntryComponent,
    UserFormSettingsComponent,
    GridLayoutComponent,
    LnearLayoutComponent,
    ValueFlagInputComponent,
    AssignSameInputComponent, 
    ImportSelectionComponent,
    DataCorrectionComponent,
    QCDataComponent,
    EditQCDataComponent,
    SourceCheckComponent,
    MissingDataComponent,
    DeletedDataComponent,
    AutoImportSelectionComponent, 
    ManageQCComponent,

    DataMonitoringComponent,
    StationDataMonitoringComponent, 

    QuerySelectionComponent,
  ],
  imports: [
    DataIngestionRoutingModule,
    SharedModule,
    MetadataModule,
  ]
})
export class DataIngestionModule { }
