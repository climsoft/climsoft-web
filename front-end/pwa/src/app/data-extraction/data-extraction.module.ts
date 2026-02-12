import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module'; 
import { ManualExportSelectionComponent } from './manual-export-selection/manual-export-selection.component';
import { DataExtractionRoutingModule } from './data-extraction-routing.module';
import { ManualExportDownloadComponent } from './manual-export/manual-export-download.component';
import { MetadataModule } from '../metadata/metadata.module';


@NgModule({
  declarations: [
    ManualExportSelectionComponent,
    ManualExportDownloadComponent, 
  ],
  imports: [
    DataExtractionRoutingModule,
    SharedModule, 
    MetadataModule,   
  ]
})
export class DataExtractionModule { }
