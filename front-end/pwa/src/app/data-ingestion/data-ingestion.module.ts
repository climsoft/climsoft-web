
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
import { MissingDataComponent } from './missing-data/missing-data.component';
import { DeletedDataComponent } from './deleted-data/deleted-data.component';
import { AutoImportSelectionComponent } from './auto-import-selection/auto-import-selection.component'; 
import { DataIngestionRoutingModule } from './data-ingestion-routing.module';
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';  
import { ObservationsModule } from '../observations/observations.module';

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
    MissingDataComponent,
    DeletedDataComponent,
    AutoImportSelectionComponent,  
  ],
  imports: [
    DataIngestionRoutingModule,
    SharedModule,
    MetadataModule,
    ObservationsModule,
  ]
})
export class DataIngestionModule { }
