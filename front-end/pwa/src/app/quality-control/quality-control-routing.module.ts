import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QCAssessmentComponent } from './qc-data-checks/qc-assessment.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'qc-assessment',
        pathMatch: 'full',
      },
      {
        path: 'qc-assessment',
        component: QCAssessmentComponent
      },
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QualityControlRoutingModule { }
