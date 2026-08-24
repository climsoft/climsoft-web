import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';  
import { DataFlowComponent } from './data-flow/data-flow.component';
import { DataExplorerComponent } from './data-explorer/data-explorer.component';
import { stationStatusComponent } from './station-status/stations-status.component'; 
import { DataAvailabilityComponent } from './data-availability/data-availability.component';
import { ProductListComponent } from './products/product-list/product-list.component';
import { ProductViewerComponent } from './products/product-viewer/product-viewer.component';

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
        path: 'data-availability',
        component: DataAvailabilityComponent
      },
      {
        path: 'data-explorer',
        component: DataExplorerComponent
      }, 
       {
        path: 'product-list',
        component: ProductListComponent
      }, 
       {
        path: 'product-viewer/:id',
        component: ProductViewerComponent
      }, 
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataMonitoringRoutingModule { }
