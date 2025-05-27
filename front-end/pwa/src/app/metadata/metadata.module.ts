import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataRoutingModule } from './metadata-routing.module';
import { FormSelectorDialogComponent } from './stations/station-detail/station-forms/form-selector-dialog/form-selector-dialog.component'; 
import { ViewRegionsComponent } from './regions/view-regions/view-regions.component';
import { ImportRegionsDialogComponent } from './regions/import-regions-dialog/import-regions-dialog.component';
import { ViewRegionsMapComponent } from './regions/view-regions/view-regions-map/view-regions-map.component';
import { ViewRegionsTableComponent } from './regions/view-regions/view-regions-table/view-regions-table.component';
import { ViewStationsTableComponent } from './stations/view-stations/view-stations-table/view-stations-table.component';
import { ViewSourcesComponent } from './source-templates/view-sources/view-sources.component';
import { FormSourceDetailComponent } from './source-templates/form-source-detail/form-source-detail.component';
import { ImportSourceDetailComponent } from './source-templates/import-source-detail/import-source-detail.component';
import { ViewStationsComponent } from './stations/view-stations/view-stations.component';
import { StationDetailComponent } from './stations/station-detail/station-detail.component';
import { StationCharacteristicsEditDialogComponent } from './stations/station-detail/station-characteristics-edit-dialog/station-characteristics-edit-dialog.component';
import { ImportStationsDialogComponent } from './stations/import-stations-dialog/import-stations-dialog.component';
import { ElementDetailComponent } from './elements/element-detail/element-detail.component';
import { ViewElementsComponent } from './elements/view-elements/view-elements.component';
import { StationCharacteristicsComponent } from './stations/station-detail/station-characteristics/station-characteristics.component';
import { StationFormsComponent } from './stations/station-detail/station-forms/station-forms.component';
import { ImportSourceStationDetailComponent } from './source-templates/import-source-detail/import-source-station-detail/import-source-station-detail.component';
import { ImportSourceElementAndValueDetailComponent } from './source-templates/import-source-detail/import-source-element-and-value-detail/import-source-element-and-value-detail.component';
import { ImportSourcePeriodDetailComponent } from './source-templates/import-source-detail/import-source-period-detail/import-source-period-detail.component';
import { ImportSourceDateDetailComponent } from './source-templates/import-source-detail/import-source-date-detail/import-source-date-detail.component';
import { ImportSourceDelimeterDetailComponent } from './source-templates/import-source-detail/import-source-delimeter-detail/import-source-delimeter-detail.component';
import { ImportSourceLevelDetailComponent } from './source-templates/import-source-detail/import-source-level-detail/import-source-level-detail.component';
import { ImportSourceMissingFlagDetailComponent } from './source-templates/import-source-detail/import-source-missing-flag-detail/import-source-missing-flag-detail.component';
import { ImportSourceFlagDetailComponent } from './source-templates/import-source-detail/import-source-flag-detail/import-source-flag-detail.component';
import { ElementCharacteristicsInputDialogComponent } from './elements/element-characteristics-input-dialog/element-characteristics-input-dialog.component';
import { ElementCharacteristicsComponent } from './elements/element-detail/element-characteristics/element-characteristics.component';
import { QCTestsComponent } from './elements/element-detail/qc-tests/qc-tests.component';
import { QCTestInputDialogComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-input-dialog.component';
import { QCTestTypeInputComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-type-input/qc-test-type-input.component';
import { QCTestRangeThresholdParamsComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-range-threshold-params/qc-test-range-threshold-params.component';
import { QCTestRepeatedValueParamsComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-range-repeated-value-params/qc-test-repeated-value-params.component';
import { QCTestFlatLineParamsComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-flat-line-params/qc-test-flat-line-params.component';
import { QCTestSpikeParamsComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-spike-params/qc-test-spike-params.component';
import { QCTestRelationalParamsComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-relational-params/qc-test-relational-params.component';
import { QCTestContextualParamsComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-contextual-params/qc-test-contextual-params.component';
import { QCTestConditionInputComponent } from './elements/element-detail/qc-test-input-dialog/qc-test-condition-input/qc-test-condition-input.component';
import { ViewStationsGeoMapComponent } from './stations/view-stations/view-stations-geo-map/view-stations-geo-map.component';
import { StationsSearchDialogComponent } from './stations/stations-search-dialog/stations-search-dialog.component';
import { ImportElementsDialogComponent } from './elements/import-elements-dialog/import-elements-dialog.component';
import { ElementsSearchDialogComponent } from './elements/elements-search-dialog/elements-search-dialog.component';
import { ElementSelectorMultipleComponent } from './elements/element-selector/element-selector-multiple/element-selector-multiple.component';
import { ElementSelectorSingleComponent } from './elements/element-selector/element-selector-single/element-selector-single.component';
import { StationSelectorSingleComponent } from './stations/station-selector/station-single-input/station-selector-single.component';
import { StationSelectorMultipleComponent } from './stations/station-selector/station-selector-multiple/station-selector-multiple.component';
import { ViewExportTemplatesComponent } from './export-templates/view-export-templates/view-export-templates.component';
import { ExportTemplateDetailComponent } from './export-templates/export-template-detail/export-template-detail.component';
import { ViewConnectorsComponent } from './connectors/view-connectors/view-connectors.component';
import { ExportTemplateSelectorSingleComponent } from './export-templates/export-template-selector/export-template-selector-single/export-template-selector-single.component';
import { ExportTemplateSelectorMultipleComponent } from './export-templates/export-template-selector/export-template-selector-multiple/export-template-selector-multiple.component';
import { SourceSelectorSingleComponent } from './source-templates/source-selector/source-single-input/source-selector-single.component';
import { SourceSelectorMultipleComponent } from './source-templates/source-selector/source-selector-multiple/source-selector-multiple.component';
import { ViewOrganisationsComponent } from './organisations/view-organisations/view-organisations.component';
import { OrganisationDetailsComponent } from './organisations/organisation-details/organisation-details.component';
import { StationObsMethodSingleInputComponent } from './stations/station-obs-method-selector/station-obs-method-single-input/station-obs-method-single-input.component';
import { StationStatusSingleInputComponent } from './stations/station-status-selector/station-status-single-input/station-status-single-input.component';
import { StationObservationFocusSingleInputComponent } from './stations/station-focus-selector/station-obs-focus-single-input/station-obs-focus-single-input.component';
import { StationObsEnvSingleInputComponent } from './stations/station-environment-selector/station-obs-environment-single-input/station-obs-env-single-input.component';
import { RegionTypeInputComponent } from './regions/region-type-selector/region-type-input.component';
import { ViewNetworkAffiliationsComponent } from './network-affiliations/view-network-affiliations/view-network-affiliations.component';
import { NetworkAffiliationDetailsComponent } from './network-affiliations/network-affiliation-details/network-affiliation-details.component';
import { OrganisationSelectorSingleComponent } from './organisations/organisation-selector/organisation-selector-single/organisation-selector-single.component';
import { StationNetworksComponent } from './stations/station-detail/stations-networks/station-networks-affiliations.component';
import { NetworkAffiliationSelectorDialogComponent } from './stations/station-detail/stations-networks/form-selector-dialog/network-affiliation-selector-dialog.component';
import { StationRegionSearchComponent as StationRegionsSearchComponent } from './stations/stations-search-dialog/station-regions-search/station-regions-search.component';
import { ElementTypeSingleInputComponent } from './elements/element-type-single-input/element-type-single-input.component';
import { ViewStationsTreeMapComponent } from './stations/view-stations/view-stations-tree-map/view-stations-tree-map.component';
import { StationOrganisationsSearchComponent } from './stations/stations-search-dialog/station-organisations-search/station-organisations-search.component';
import { StationNetworkAffiliationsSearchComponent } from './stations/stations-search-dialog/station-network-affiliations-search/station-network-affiliations-search.component';
import { StationStatusSearchComponent } from './stations/stations-search-dialog/station-status-search/station-status-search.component';
import { StationProcessingMethodSearchComponent } from './stations/stations-search-dialog/station-processing-search/station-processing-method-search.component';
import { StationFocusesSearchComponent } from './stations/stations-search-dialog/station-focuses-search/station-focuses-search.component';
import { StationEnvironmentsSearchComponent } from './stations/stations-search-dialog/station-environments-search/station-environments-search.component';
import { QCStatusSelectorSingleComponent } from './elements/element-detail/qc-status-selector-single/qc-status-selector-single.component';
import { ExportTypeSelectorSingleComponent } from './export-templates/export-type-selector-single/export-type-selector-single.component';
import { NetworkAffiliationsSelectorSingleComponent } from './network-affiliations/network-affiliations-selector/network-affiliations-selector-single/network-affiliations-selector-single.component';
import { StationIDNameSearchComponent } from './stations/stations-search-dialog/station-id-name-search/station-id-name-search.component';

@NgModule({
  declarations: [ 
    FormSelectorDialogComponent,

    ViewNetworkAffiliationsComponent,
    NetworkAffiliationDetailsComponent,
    NetworkAffiliationSelectorDialogComponent,

    ViewOrganisationsComponent,
    OrganisationDetailsComponent,
    OrganisationSelectorSingleComponent,

    ViewRegionsComponent,
    ViewRegionsTableComponent,
    ViewRegionsMapComponent,
    RegionTypeInputComponent,

    ViewSourcesComponent,
    FormSourceDetailComponent,
    ImportSourceDetailComponent,

    ViewStationsComponent,
    StationDetailComponent,
    StationCharacteristicsEditDialogComponent,
    ImportStationsDialogComponent,
    StationObsMethodSingleInputComponent,
    StationObsEnvSingleInputComponent,
    StationObservationFocusSingleInputComponent,
    StationStatusSingleInputComponent,
    ViewStationsTableComponent,
    ViewStationsGeoMapComponent,
    ViewStationsTreeMapComponent,
     
    StationNetworksComponent, 

    StationsSearchDialogComponent,
    StationIDNameSearchComponent,
    StationRegionsSearchComponent, 
    StationOrganisationsSearchComponent,
    StationNetworkAffiliationsSearchComponent,
    StationStatusSearchComponent,
    StationProcessingMethodSearchComponent,
    StationFocusesSearchComponent,
    StationEnvironmentsSearchComponent,
 
    ElementDetailComponent,
    ViewElementsComponent,
    StationCharacteristicsComponent,
    StationFormsComponent,
    ImportSourceStationDetailComponent,
    ImportSourceElementAndValueDetailComponent,
    ImportSourcePeriodDetailComponent,
    ImportSourceDateDetailComponent,
    ImportSourceDelimeterDetailComponent,
    ImportSourceLevelDetailComponent,
    ImportSourceMissingFlagDetailComponent,
    ImportSourceFlagDetailComponent,
    ElementCharacteristicsInputDialogComponent,
    ElementCharacteristicsComponent,
    ImportElementsDialogComponent,

    ElementTypeSingleInputComponent,

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
    ImportRegionsDialogComponent,


    ElementsSearchDialogComponent,
    ElementSelectorSingleComponent,
    ElementSelectorMultipleComponent,

    StationSelectorMultipleComponent,
    StationSelectorSingleComponent,

    SourceSelectorSingleComponent,
    SourceSelectorMultipleComponent,

    ViewExportTemplatesComponent,
    ExportTemplateDetailComponent,
    ExportTemplateSelectorSingleComponent,
    ExportTemplateSelectorMultipleComponent,

    ViewConnectorsComponent,

    QCStatusSelectorSingleComponent,
    ExportTypeSelectorSingleComponent, 

    NetworkAffiliationsSelectorSingleComponent,

  ],
  imports: [
    MetadataRoutingModule,
    SharedModule,
  ],
  exports: [ 
    ElementSelectorSingleComponent,
    ElementSelectorMultipleComponent,
    ElementsSearchDialogComponent,
    ElementTypeSingleInputComponent,

    StationObsMethodSingleInputComponent,
    StationObsEnvSingleInputComponent,
    StationObservationFocusSingleInputComponent,
    StationStatusSingleInputComponent,
    ViewStationsTableComponent,
    ViewStationsGeoMapComponent,

    StationSelectorMultipleComponent,
    StationSelectorSingleComponent,
    ViewStationsGeoMapComponent,
    ViewStationsTreeMapComponent,

    StationsSearchDialogComponent, 

    FormSelectorDialogComponent,

    SourceSelectorSingleComponent,
    SourceSelectorMultipleComponent,

    ExportTemplateSelectorSingleComponent,
    ExportTemplateSelectorMultipleComponent,

    QCStatusSelectorSingleComponent,
    ExportTypeSelectorSingleComponent,
  
  ]
})
export class MetadataModule { } 
