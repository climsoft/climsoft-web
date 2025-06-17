import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SourceChecksComponent } from './source-checks/source-checks.component';
import { ScheduledQCTestComponent } from './scheduled-qc-test/scheduled-qc-test.component';
import { QCDataChecksComponent } from './qc-data-checks/qc-data-checks.component';

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
        path: 'qc-data-checks',
        component: QCDataChecksComponent
      },
      {
        path: 'scheduled-qc-selection',
        component: ScheduledQCTestComponent
      },
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QualityControlRoutingModule { }
