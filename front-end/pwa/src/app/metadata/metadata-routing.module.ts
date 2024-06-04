import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';  
import { StationsComponent } from './stations/stations.component';
import { StationDetailComponent } from './station-detail/station-detail.component';
import { ElementsComponent } from './elements/elements.component';
import { ElementDetailComponent } from './element-detail/element-detail.component';
import { FormDetailComponent } from './form-detail/form-detail.component';
import { SourcesComponent } from './sources/sources.component';
import { ImportDetailComponent } from './import-detail/import-detail.component';


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
        path: 'form-detail/:id',
        component: FormDetailComponent
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
        path: 'import-detail/:id',
        component: ImportDetailComponent
      },
     
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MetadataRoutingModule { }
