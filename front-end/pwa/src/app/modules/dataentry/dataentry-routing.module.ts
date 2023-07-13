import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormEntryComponent } from './form-entry/form-entry.component';
import { ImportEntryComponent } from './import-entry/import-entry.component';


const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Data Entry'
    },
    children: [
      {
        path: '',
        redirectTo: 'formentry',
        pathMatch: 'full',
      },      
      {
        path: 'formentry',
        component: FormEntryComponent,
        data: {
          subComponent: true
        }
      },
      {
        path: 'importentry',
        component: ImportEntryComponent,
        data: {
          title: 'Import Data'
        }
      }
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DataEntryRoutingModule { }
