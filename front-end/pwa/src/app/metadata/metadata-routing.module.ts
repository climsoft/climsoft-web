import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';  
import { StationsComponent } from './stations-components/stations/stations.component';
import { ElementsComponent } from './elements/elements.component';
import { ElementDetailComponent } from './element-detail/element-detail.component';
import { FormSourceDetailComponent } from './sources-components/form-source-detail/form-source-detail.component';
import { SourcesComponent } from './sources-components/sources/sources.component';
import { StationDetailComponent } from './stations-components/station-detail/station-detail.component';
import { ImportSourceDetailComponent } from './sources-components/import-source-detail/import-source-detail.component';
import { ImportStationComponent } from './stations-components/station-edits-components/import-station/import-station.component';


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
        component: ElementsComponent, 
      },
      {
        path: 'element-detail/:id',
        component: ElementDetailComponent
      },
      {
        path: 'sources',
        component: SourcesComponent, 
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
        component: StationsComponent, 
      },
      {
        path: 'station-detail/:id',
        component: StationDetailComponent
      },
      {
        path: 'import-station',
        component: ImportStationComponent
      },
   
     
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MetadataRoutingModule { }
