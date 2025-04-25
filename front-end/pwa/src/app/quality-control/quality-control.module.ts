
import { NgModule } from '@angular/core'; 
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module'; 
import { QualityControlRoutingModule } from './quality-control-routing.module';
import { ObservationsModule } from '../observations/observations.module';
import { SourceCheckComponent } from './source-check/source-check.component';
import { QCDataComponent } from './qc-data/qc-data.component';

@NgModule({

  declarations: [
    SourceCheckComponent,
    QCDataComponent, 
  ],
  imports: [
    QualityControlRoutingModule,
    SharedModule,
    MetadataModule, 
    ObservationsModule,  
  ]
}) 
export class QualityControlModule {  }
 