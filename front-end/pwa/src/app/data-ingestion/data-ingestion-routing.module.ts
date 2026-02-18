import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormEntryComponent } from './data-entry/form-entry/form-entry.component';

import { StationFormSelectionComponent } from './data-entry/station-form-selection/station-form-selection.component';
import { ImportSelectionComponent } from './import-selection/import-selection.component';
import { AutoImportSelectionComponent } from './auto-import-selection/auto-import-selection.component';
import { DeletedDataComponent } from './deleted-data/deleted-data.component'; 
import { DataCorrectionComponent } from './data-correction/data-correction.component';  


const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Data Entry'
    },
    children: [
      {
        path: '',
        redirectTo: 'station-form-selection',
        pathMatch: 'full',
      },
      {
        path: 'station-form-selection',
        component: StationFormSelectionComponent
      },
      {
        path: 'form-entry/:stationid/:sourceid',
        component: FormEntryComponent
      },
      {
        path: 'manual-import-selection',
        component: ImportSelectionComponent
      },
{
        path: 'auto-import-selection',
        component: AutoImportSelectionComponent
      },
      {
        path: 'auto-import-selection',
        component: AutoImportSelectionComponent
      },
      {
        path: 'data-correction',
        component: DataCorrectionComponent
      },
      {
        path: 'deleted-data',
        component: DeletedDataComponent
      }, 
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataIngestionRoutingModule { }
