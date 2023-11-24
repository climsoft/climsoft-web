
import { NgModule } from '@angular/core';
import { DataEntryRoutingModule } from './dataentry-routing.module';
import { SharedModule } from '../shared/shared.module';

//------- other packages modules  -------
// import { AgGridModule } from 'ag-grid-angular';
//--------------------------------

//------- app forms components -------
import { DataGridEntryComponent } from './controls/data-grid-entry/data-grid-entry.component';
import { FormEntryComponent } from './form-entry/form-entry.component';
import { ImportEntryComponent } from './import-entry/import-entry.component';
import { ValueFlagEntryComponent } from './controls/value-flag-entry/value-flag-entry.component'; 
import { StationFormSelectionComponent } from './station-form-selection/station-form-selection.component';
//------------------------------------


@NgModule({

  declarations: [
    DataGridEntryComponent,
    FormEntryComponent,
    ValueFlagEntryComponent,
    ImportEntryComponent, 
    StationFormSelectionComponent
  ],
  imports: [
    DataEntryRoutingModule,
    SharedModule,
    // AgGridModule
  ]
})
export class DataEntryModule { }
