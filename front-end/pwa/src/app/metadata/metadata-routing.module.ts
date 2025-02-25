import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';  
import { ViewStationsComponent } from './stations/view-stations/view-stations.component';
import { ViewElementsComponent } from './elements/view-elements/view-elements.component';
import { ElementDetailComponent } from './elements/element-detail/element-detail.component';
import { FormSourceDetailComponent } from './sources/form-source-detail/form-source-detail.component';
import { ViewSourcesComponent } from './sources/view-sources/view-sources.component';
import { StationDetailComponent } from './stations/station-detail/station-detail.component';
import { ImportSourceDetailComponent } from './sources/import-source-detail/import-source-detail.component';
import { ViewRegionsComponent } from './regions/view-regions/view-regions.component';
import { ViewExportsComponent } from './exports/view-exports/view-exports.component';
import { ExportDetailComponent } from './exports/export-detail/export-detail.component';
import { ViewConnectorsComponent } from './connectors/view-connectors/view-connectors.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Metadata'
    },
    children: [
      {
        path: '',
        redirectTo: 'view-elements',
        pathMatch: 'full',
      },
      {
        path: 'view-elements',
        component: ViewElementsComponent, 
      },
      {
        path: 'element-detail/:id',
        component: ElementDetailComponent
      },
      {
        path: 'view-sources',
        component: ViewSourcesComponent, 
      }, 
      {
        path: 'form-source-detail/:id',
        component: FormSourceDetailComponent
      },
      {
        path: 'import-source-detail/:id',
        component: ImportSourceDetailComponent
      },
      {
        path: 'view-stations',
        component: ViewStationsComponent, 
      },
      {
        path: 'station-detail/:id',
        component: StationDetailComponent
      },
      {
        path: 'view-regions',
        component: ViewRegionsComponent
      }, 
      {
        path: 'view-exports',
        component: ViewExportsComponent
      },
      {
        path: 'export-detail/:id',
        component: ExportDetailComponent
      }, 
      {
        path: 'view-connectors',
        component: ViewConnectorsComponent
      }, 

     
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MetadataRoutingModule { }
