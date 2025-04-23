
import { NgModule } from '@angular/core'; 
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module'; 
import { QuerySelectionComponent } from './query-selection/query-selection.component';

@NgModule({

  declarations: [
    QuerySelectionComponent, 
  ],
  imports: [ 
    SharedModule,
    MetadataModule,   
  ],
  exports: [
    QuerySelectionComponent,
  ]
})
export class ObservationsModule { }
