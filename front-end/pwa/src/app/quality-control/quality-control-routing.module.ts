import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';   
import { SourceCheckComponent } from './source-check/source-check.component';
import { QCDataComponent } from './qc-data/qc-data.component';

const routes: Routes = [
  {
    path: '', 
    children: [
      {
        path: '',
        redirectTo: 'source-check',
        pathMatch: 'full',
      },
      {
        path: 'source-check',
        component: SourceCheckComponent
      },
      {
        path: 'quality-control-selection',
        component: QCDataComponent
      }, 
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QualityControlRoutingModule { }
