import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SourceCheckComponent } from './source-check/source-check.component';
import { ScheduledQCTestComponent } from './scheduled-qc-test/scheduled-qc-test.component';
import { ElementQCSelectionComponent } from './element-qc-selection/element-qc-selection.component';
import { QCDataChecksComponent } from './qc-data-checks/qc-data-checks.component';

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
        path: 'element-qc-selection',
        component: ElementQCSelectionComponent
      },
      {
        path: 'element-qc-data-checks/:id',
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
