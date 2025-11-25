
import { NgModule } from '@angular/core';
import { ImportEntryComponent } from './import-entry/import-entry.component';
import { StationFormSelectionComponent } from './data-entry/station-form-selection/station-form-selection.component';
import { FormEntryComponent } from './data-entry/form-entry/form-entry.component';
import { UserFormSettingsComponent } from './data-entry/form-entry/user-form-settings/user-form-settings.component';
import { GridLayoutComponent } from './data-entry/form-entry/grid-layout/grid-layout.component';
import { LinearLayoutComponent } from './data-entry/form-entry/linear-layout/linear-layout.component'; 
import { AssignSameInputComponent } from './data-entry/form-entry/assign-same-input/assign-same-input.component';
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
    LinearLayoutComponent, 
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
  ],
  exports: [
  ]
})
export class DataIngestionModule { }
