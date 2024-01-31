import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router'; 
import { FormsComponent } from './forms/forms.component';
import { StationsComponent } from './stations/stations.component';
import { StationDetailComponent } from './station-detail/station-detail.component';
import { ElementsComponent } from './elements/elements.component';
import { ElementDetailComponent } from './element-detail/element-detail.component';
import { FormDetailComponent } from './form-detail/form-detail.component';


const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Metadata'
    },
    children: [
      {
        path: '',
        redirectTo: 'forms',
        pathMatch: 'full',
      },
      {
        path: 'forms',
        component: FormsComponent, 
        data: {
          subComponent: true
        }
      }, 
      {
        path: 'form-detail/:sourceid',
        component: FormDetailComponent
      },
      {
        path: 'stations',
        component: StationsComponent
      },
      {
        path: 'station-detail/:stationid',
        component: StationDetailComponent
      },
      {
        path: 'elements',
        component: ElementsComponent
      },
      {
        path: 'element-detail/:id',
        component: ElementDetailComponent
      },
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MetadataRoutingModule { }
