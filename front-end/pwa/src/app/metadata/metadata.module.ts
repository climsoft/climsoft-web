import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataRoutingModule } from './metadata-routing.module';

import { FormSourceDetailComponent } from './sources-components/form-source-detail/form-source-detail.component';
import { ViewStationsComponent } from './stations-components/view-stations/view-stations.component';
import { FormSelectorDialogComponent } from './controls/form-selector-dialog/form-selector-dialog.component';
import { ElementsSelectorDialogComponent } from './controls/elements-selector-dialog/elements-selector-dialog.component';
import { StationElementLimitsInputDialogComponent } from './controls/station-element-limits-input-dialog/station-element-limits-input-dialog.component';
import { ElementDetailComponent } from './element-detail/element-detail.component';
import { ViewElementsComponent } from './elements/view-elements/view-elements.component';
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
import { ImportSourceDelimeterDetailComponent } from './sources-components/import-source-detail/import-source-delimeter-detail/import-source-delimeter-detail.component';
import { ImportSourceElevationDetailComponent } from './sources-components/import-source-detail/import-source-elevation-detail/import-source-elevation-detail.component';
import { ImportSourceMissingFlagDetailComponent } from './sources-components/import-source-detail/import-source-missing-flag-detail/import-source-missing-flag-detail.component';
import { ImportSourceFlagDetailComponent } from './sources-components/import-source-detail/import-source-flag-detail/import-source-flag-detail.component';
import { QCTestsComponent } from './element-detail/qc-tests/qc-tests.component';
import { QCTestInputDialogComponent } from './element-detail/qc-test-input-dialog/qc-test-input-dialog.component';
import { QCTestTypeInputComponent } from './element-detail/qc-test-input-dialog/qc-test-type-input/qc-test-type-input.component';
import { QCTestRangeThresholdParamsComponent } from './element-detail/qc-test-input-dialog/qc-test-range-threshold-params/qc-test-range-threshold-params.component';
import { ElementCharacteristicsInputDialogComponent } from './elements/element-characteristics-input-dialog/element-characteristics-input-dialog.component';
import { ElementCharacteristicsComponent } from './element-detail/element-characteristics/element-characteristics.component';
import { QCTestRepeatedValueParamsComponent } from './element-detail/qc-test-input-dialog/qc-test-range-repeated-value-params/qc-test-repeated-value-params.component';
import { QCTestFlatLineParamsComponent } from './element-detail/qc-test-input-dialog/qc-test-flat-line-params/qc-test-flat-line-params.component';
import { QCTestSpikeParamsComponent } from './element-detail/qc-test-input-dialog/qc-test-spike-params/qc-test-spike-params.component';
import { QCTestRelationalParamsComponent } from './element-detail/qc-test-input-dialog/qc-test-relational-params/qc-test-relational-params.component';
import { QCTestConditionInputComponent } from './element-detail/qc-test-input-dialog/qc-test-condition-input/qc-test-condition-input.component';
import { QCTestContextualParamsComponent } from './element-detail/qc-test-input-dialog/qc-test-contextual-params/qc-test-contextual-params.component';
import { ViewRegionsComponent } from './regions/view-regions/view-regions.component';
import { ImportRegionsComponent } from './regions/import-regions/import-regions.component';
import { ViewRegionsMapComponent } from './regions/view-regions/view-regions-map/view-regions-map.component';
import { ViewRegionsTableComponent } from './regions/view-regions/view-regions-table/view-regions-table.component';
import { ViewStationsTableComponent } from './stations-components/view-stations/view-stations-table/view-stations-table.component';
import { ViewStationsMapComponent } from './stations-components/view-stations/view-stations-map/view-stations-map.component';
import { StationsSearchComponent } from './stations-components/stations-search/stations-search.component';
import { StationsIdNameSearchComponent } from './stations-components/stations-search/stations-id-name-search/stations-id-name-search.component';
import { StationsSearchDialogComponent } from './stations-components/stations-search-dialog/stations-search-dialog.component';
import { StationsSearchByComponent } from './stations-components/stations-search/stations-search-by/stations-search-by.component';
import { StationsSearchHistoryComponent } from './stations-components/stations-search/stations-search-history/stations-search-history.component';

@NgModule({
  declarations: [
    ElementsSelectorDialogComponent,
    FormSelectorDialogComponent,
    StationElementLimitsInputDialogComponent,

    SourcesComponent,
    FormSourceDetailComponent,
    ImportSourceDetailComponent,

    ViewStationsComponent,
    StationDetailComponent,
    StationCharacteristicsEditDialogComponent,
    ImportStationDialogComponent,

    ElementDetailComponent,
    ViewElementsComponent,
    StationCharacteristicsComponent,
    StationFormsComponent,
    StationLimitsComponent,
    ImportStationComponent,
    ImportSourceStationDetailComponent,
    ImportSourceElementAndValueDetailComponent,
    ImportSourcePeriodDetailComponent,
    ImportSourceDateDetailComponent,
    ImportSourceDelimeterDetailComponent,
    ImportSourceElevationDetailComponent,
    ImportSourceMissingFlagDetailComponent,
    ImportSourceFlagDetailComponent,
    ElementCharacteristicsInputDialogComponent,
    ElementCharacteristicsComponent,
    QCTestsComponent, 
    QCTestInputDialogComponent,
    QCTestTypeInputComponent,
    QCTestRangeThresholdParamsComponent,
    QCTestRepeatedValueParamsComponent,
    QCTestFlatLineParamsComponent,
    QCTestSpikeParamsComponent,
    QCTestRelationalParamsComponent,
    QCTestContextualParamsComponent,
    QCTestConditionInputComponent,
    ImportRegionsComponent,
    ViewRegionsComponent,   
    ViewRegionsTableComponent,
    ViewRegionsMapComponent,
    ViewStationsTableComponent,
    ViewStationsMapComponent,

    StationsSearchDialogComponent,
    StationsSearchComponent,
    StationsSearchHistoryComponent,
    StationsSearchByComponent,
    StationsIdNameSearchComponent,
   
  ],
  imports: [
    SharedModule,
    MetadataRoutingModule
  ],
  exports: [
    ElementsSelectorDialogComponent,
    FormSelectorDialogComponent,

    StationsSearchComponent,
  ]
})
export class MetadataModule { }
