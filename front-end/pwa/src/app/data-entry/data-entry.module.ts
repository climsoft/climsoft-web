
import { NgModule } from '@angular/core';
import { DataEntryRoutingModule } from './data-entry-routing.module';
import { SharedModule } from '../shared/shared.module';

//------- app forms components -------
import { FormEntryComponent } from './form-entry/form-entry.component';
import { ImportEntryComponent } from './import-entry/import-entry.component';
import { StationFormSelectionComponent } from './station-form-selection/station-form-selection.component';
import { GridLayoutComponent } from './form-entry/grid-layout/grid-layout.component';
import { LnearLayoutComponent } from './form-entry/linear-layout/linear-layout.component';
import { ValueFlagInputComponent } from './form-entry/value-flag-input/value-flag-input.component';
import { ManageDataComponent } from './manage-data/manage-data.component';
import { ImportSelectionComponent } from './import-selection/import-selection.component';
import { EditDataComponent } from './manage-data/edit-data/edit-data.component';
import { QCDataComponent } from './manage-data/qc-data/qc-data.component';
import { MissingDataComponent } from './manage-data/missing-data/missing-data.component';
import { DeletedDataComponent } from './manage-data/deleted-data/deleted-data.component';
import { AssignSameInputComponent } from './form-entry/assign-same-input/assign-same-input.component';
import { EditQCDataComponent } from './manage-data/qc-data/edit-qc-data/edit-qc-data.component';
import { SourceCheckComponent } from './manage-data/source-check/source-check.component';
import { MetadataModule } from '../metadata/metadata.module';

//------------------------------------


@NgModule({

  declarations: [
    ImportEntryComponent,
    StationFormSelectionComponent,
    FormEntryComponent,
    GridLayoutComponent,
    LnearLayoutComponent,
    ValueFlagInputComponent,
    AssignSameInputComponent,
    ManageDataComponent,
    ImportSelectionComponent,
    EditDataComponent,
    QCDataComponent,
    EditQCDataComponent,
    SourceCheckComponent,
    MissingDataComponent,
    DeletedDataComponent
  ],
  imports: [
    DataEntryRoutingModule,
    SharedModule,
    MetadataModule,
  ]
})
export class DataEntryModule { }
