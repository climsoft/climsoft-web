import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';  
import { DataFlowComponent } from './data-flow/data-flow.component';
import { DataExplorerComponent } from './data-explorer/data-explorer.component';
import { stationStatusComponent } from './station-status/stations-status.component'; 

const routes: Routes = [
  {
    path: '', 
    children: [
      {
        path: '',
        redirectTo: 'station-status',
        pathMatch: 'full',
      },
      {
        path: 'station-status',
        component: stationStatusComponent
      },
      {
        path: 'data-flow',
        component: DataFlowComponent
      },
      {
        path: 'data-explorer',
        component: DataExplorerComponent
      }, 
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataMonitoringRoutingModule { }
