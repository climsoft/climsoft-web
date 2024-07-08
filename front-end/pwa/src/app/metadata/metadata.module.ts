import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataRoutingModule } from './metadata-routing.module';

import { FormSourceDetailComponent } from './sources-components/form-source-detail/form-source-detail.component';
import { StationsComponent } from './stations-components/stations/stations.component';
import { FormSelectorDialogComponent } from './controls/form-selector-dialog/form-selector-dialog.component';
import { ElementsSelectorDialogComponent } from './controls/elements-selector-dialog/elements-selector-dialog.component';
import { StationElementLimitsInputDialogComponent } from './controls/station-element-limits-input-dialog/station-element-limits-input-dialog.component';
import { ElementDetailComponent } from './element-detail/element-detail.component';
import { ElementsComponent } from './elements/elements.component';
import { SourcesComponent } from './sources-components/sources/sources.component';
import { ImportStationDialogComponent } from './stations-components/station-edits-components/import-station-dialog/import-station-dialog.component';
import { StationDetailComponent } from './stations-components/station-detail/station-detail.component';
import { StationCharacteristicsComponent } from './stations-components/station-detail/station-characteristics/station-characteristics.component';
import { StationFormsComponent } from './stations-components/station-detail/station-forms/station-forms.component';
import { StationLimitsComponent } from './stations-components/station-detail/station-limits/station-limits.component';
import { StationCharacteristicsEditDialogComponent } from './stations-components/station-edits-components/station-characteristics-edit-dialog/station-characteristics-edit-dialog.component';
import { ImportSourceDetailComponent } from './sources-components/import-source-detail/import-source-detail.component';
import { ImportStationComponent } from './stations-components/station-edits-components/import-station/import-station.component'; 
import { ImportSourceStationDetailComponent } from './sources-components/import-source-detail/import-source-station-detail/import-source-station-detail.component';
import { ImportSourceElementAndValueDetailComponent } from './sources-components/import-source-detail/import-source-element-and-value-detail/import-source-element-and-value-detail.component';
import { ImportSourcePeriodDetailComponent } from './sources-components/import-source-detail/import-source-period-detail/import-source-period-detail.component';
import { ImportSourceDateDetailComponent } from './sources-components/import-source-detail/import-source-date-detail/import-source-date-detail.component'; 

@NgModule({
  declarations: [
    ElementsSelectorDialogComponent,
    FormSelectorDialogComponent,
    StationElementLimitsInputDialogComponent,

    SourcesComponent,
    FormSourceDetailComponent,
    ImportSourceDetailComponent,

    StationsComponent,
    StationDetailComponent,
    StationCharacteristicsEditDialogComponent,
    ImportStationDialogComponent,
  
    ElementDetailComponent,
    ElementsComponent,
    StationCharacteristicsComponent,
    StationFormsComponent,
    StationLimitsComponent,
    ImportStationComponent, 
    ImportSourceStationDetailComponent,
    ImportSourceElementAndValueDetailComponent,
    ImportSourcePeriodDetailComponent,
    ImportSourceDateDetailComponent, 
 
 
  ],
  imports: [
    SharedModule,
    MetadataRoutingModule
  ],
  exports: [
    ElementsSelectorDialogComponent,
    FormSelectorDialogComponent,
  ]
})
export class MetadataModule { }
