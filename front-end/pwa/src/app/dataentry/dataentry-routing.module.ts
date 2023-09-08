import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormEntryComponent } from './form-entry/form-entry.component';
import { ImportEntryComponent } from './import-entry/import-entry.component';
import { StationSelectionComponent } from './station-selection/station-selection.component';
import { FormSelectionComponent } from './form-selection/form-selection.component';


const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Data Entry'
    },
    children: [
      {
        path: '',
        redirectTo: 'station-selection',
        pathMatch: 'full',
      },   
      {
        path: 'station-selection',
        component: StationSelectionComponent
      }, 
      {
        path: 'form-selection/:stationid',
        component: FormSelectionComponent
      },     
      {
        path: 'form-entry/:stationid/:datasourceid',
        component: FormEntryComponent
      },
      {
        path: 'import-entry',
        component: ImportEntryComponent
      }
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataEntryRoutingModule { }
