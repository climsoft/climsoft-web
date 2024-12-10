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
import { ImportRegionsDialogComponent } from './regions/import-regions-dialog/import-regions-dialog.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Metadata'
    },
    children: [
      {
        path: '',
        redirectTo: 'elements',
        pathMatch: 'full',
      },
      {
        path: 'elements',
        component: ViewElementsComponent, 
      },
      {
        path: 'element-detail/:id',
        component: ElementDetailComponent
      },
      {
        path: 'sources',
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
        path: 'stations',
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
     
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MetadataRoutingModule { }
