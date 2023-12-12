import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataRoutingModule } from './metadata-routing.module';

import { FormsComponent } from './forms/forms.component'; 
import { FormDetailComponent } from './form-detail/form-detail.component';
import { StationsComponent } from './stations/stations.component';
import { StationDetailComponent } from './station-detail/station-detail.component';
import { FormSelectorDialogComponent } from './controls/form-selector-dialog/form-selector-dialog.component';
import { ElementsSelectorDialogComponent } from './controls/elements-selector-dialog/elements-selector-dialog.component';
import { StationElementLimitsInputDialogComponent } from './controls/station-element-limits-input-dialog/station-element-limits-input-dialog.component';
import { ElementDetailComponent } from './element-detail/element-detail.component';
import { ElementsComponent } from './elements/elements.component';


const controlsComponents = [
  ElementsSelectorDialogComponent,
  FormSelectorDialogComponent,
  StationElementLimitsInputDialogComponent,
];


@NgModule({
  declarations: [
    ...controlsComponents,

    FormsComponent,
    FormDetailComponent,
    StationsComponent,
    StationDetailComponent,
    ElementsSelectorDialogComponent,
    ElementDetailComponent,
    ElementsComponent, 
  ],
  imports: [
    SharedModule,
    MetadataRoutingModule
  ],
  exports: [
    ...controlsComponents,
  ]
})
export class MetadataModule { }
