
import { NgModule } from '@angular/core';
import { DataEntryRoutingModule } from './data-entry-routing.module';
import { SharedModule } from '../shared/shared.module';

//------- app forms components -------
import { FormEntryComponent } from './form-entry/form-entry.component';
import { ImportEntryComponent } from './import-entry/import-entry.component';
import { StationFormSelectionComponent } from './station-form-selection/station-form-selection.component';
import { GridLayoutComponent } from './form-entry/grid-layout/grid-layout.component';
import { LnearLayoutComponent } from './form-entry/linear-layout/linear-layout.component';
import { ValueFlagInputComponent } from './controls/value-flag-input/value-flag-input.component';
import { ViewEntryComponent } from './view-entry/view-entry.component';

//------------------------------------


@NgModule({

  declarations: [
    ImportEntryComponent,

    StationFormSelectionComponent,
    FormEntryComponent,
    GridLayoutComponent,
    LnearLayoutComponent,
    ValueFlagInputComponent,
    ViewEntryComponent, 

  ],
  imports: [
    DataEntryRoutingModule,
    SharedModule,
  ]
})
export class DataEntryModule { }
