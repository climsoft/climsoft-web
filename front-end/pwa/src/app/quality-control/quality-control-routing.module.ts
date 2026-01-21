import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SourceChecksComponent } from './source-checks/source-checks.component';
import { QCAssessmentComponent } from './qc-data-checks/qc-assessment.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'source-checks',
        pathMatch: 'full',
      },
      {
        path: 'source-checks',
        component: SourceChecksComponent
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
