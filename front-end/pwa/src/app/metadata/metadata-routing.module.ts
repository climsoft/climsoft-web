import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router'; 
import { FormBuilderComponent } from './form-builder/form-builder.component';
import { FormsComponent } from './forms/forms.component';
import { StationsComponent } from './stations/stations.component';
import { StationDetailComponent } from './station-detail/station-detail.component';
import { ElementsComponent } from './elements/elements.component';
import { ElementDetailComponent } from './element-detail/element-detail.component';


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
        path: 'form-builder',
        component: FormBuilderComponent
      },
      {
        path: 'form-builder/:sourceid',
        component: FormBuilderComponent
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
        path: 'element-detail/:elementid',
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
