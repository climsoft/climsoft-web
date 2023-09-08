import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataRoutingModule } from './metadata-routing.module';

import { FormsComponent } from './forms/forms.component';
import { FormBuilderComponent } from './form-builder/form-builder.component';
import { StationsComponent } from './stations/stations.component';



@NgModule({
  declarations: [
    FormsComponent,
    FormBuilderComponent,
    StationsComponent    
  ],
  imports: [
    SharedModule,
    MetadataRoutingModule
  ]
})
export class MetadataModule { }
