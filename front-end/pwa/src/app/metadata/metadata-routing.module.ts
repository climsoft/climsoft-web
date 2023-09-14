import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router'; 
import { FormBuilderComponent } from './form-builder/form-builder.component';
import { FormsComponent } from './forms/forms.component';
import { StationsComponent } from './stations/stations.component';


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
      }
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MetadataRoutingModule { }
