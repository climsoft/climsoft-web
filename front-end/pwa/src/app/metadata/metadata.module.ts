import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataRoutingModule } from './metadata-routing.module';

import { FormsComponent } from './forms/forms.component';
import { FormBuilderComponent } from './form-builder/form-builder.component';
import { StationsComponent } from './stations/stations.component';
import { StationDetailComponent } from './station-detail/station-detail.component';
import { FormSelectorDialogComponent } from './controls/form-selector-dialog/form-selector-dialog.component';
import { ElementsSelectorDialogComponent } from './controls/elements-selector-dialog/elements-selector-dialog.component';
import { StationElementLimitsInputDialogComponent } from './controls/station-element-limits-input-dialog/station-element-limits-input-dialog.component';
import { ElementDetailComponent } from './element-detail/element-detail.component';

const controlsComponents = [
  ElementsSelectorDialogComponent,
  FormSelectorDialogComponent,
  StationElementLimitsInputDialogComponent,
];


@NgModule({
  declarations: [
    ...controlsComponents,

    FormsComponent,
    FormBuilderComponent,
    StationsComponent,
    StationDetailComponent,
    ElementsSelectorDialogComponent,
    ElementDetailComponent,    
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
