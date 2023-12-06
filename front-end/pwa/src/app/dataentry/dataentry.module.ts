
import { NgModule } from '@angular/core';
import { DataEntryRoutingModule } from './dataentry-routing.module';
import { SharedModule } from '../shared/shared.module';

//------- app forms components -------
import { FormEntryComponent } from './form-entry/form-entry.component';
import { ImportEntryComponent } from './import-entry/import-entry.component';
import { StationFormSelectionComponent } from './station-form-selection/station-form-selection.component';
import { GridLayoutComponent } from './controls/grid-layout/grid-layout.component';
import { LnearLayoutComponent } from './controls/linear-layout/linear-layout.component';
import { ValueFlagInputComponent } from './controls/value-flag-input/value-flag-input.component';
//------------------------------------


@NgModule({

  declarations: [
    ImportEntryComponent,

    StationFormSelectionComponent,
    FormEntryComponent,
    GridLayoutComponent,
    LnearLayoutComponent,
    ValueFlagInputComponent,


  ],
  imports: [
    DataEntryRoutingModule,
    SharedModule,
  ]
})
export class DataEntryModule { }
