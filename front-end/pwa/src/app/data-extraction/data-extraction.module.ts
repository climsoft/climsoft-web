import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module'; 
import { ManualExportSelectionComponent } from './manual-export-selection/manual-export-selection.component';
import { DataExtractionRoutingModule } from './data-extraction-routing.module';
import { AutoExportSelectionComponent } from './auto-export-selection/auto-export-selection.component';
import { ManualExportDownloadComponent } from './manual-export/manual-export-download.component';


@NgModule({
  declarations: [
    ManualExportSelectionComponent,
    ManualExportDownloadComponent,
    AutoExportSelectionComponent,
  ],
  imports: [
    DataExtractionRoutingModule,
    SharedModule,    
  ]
})
export class DataExtractionModule { }
