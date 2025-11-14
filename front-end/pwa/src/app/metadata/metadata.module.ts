import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataRoutingModule } from './metadata-routing.module'; 
import { ViewRegionsComponent } from './regions/view-regions/view-regions.component';
import { ImportRegionsDialogComponent } from './regions/import-regions-dialog/import-regions-dialog.component';
import { ViewRegionsMapComponent } from './regions/view-regions/view-regions-map/view-regions-map.component';
import { ViewRegionsTableComponent } from './regions/view-regions/view-regions-table/view-regions-table.component';
import { ViewStationsTableComponent } from './stations/view-stations/view-stations-table/view-stations-table.component';
import { ViewSourcesComponent } from './source-templates/view-sources/view-sources.component';
import { FormSourceDetailComponent } from './source-templates/form-source-detail/form-source-detail.component';
import { ImportSourceDetailComponent } from './source-templates/import-source-detail/import-source-detail.component';
import { ViewStationsComponent } from './stations/view-stations/view-stations.component'; 
import { EditStationDialogComponent } from './stations/edit-station-dialog/edit-station-dialog.component';
import { ImportStationsDialogComponent } from './stations/import-stations-dialog/import-stations-dialog.component'; 
import { ViewElementsComponent } from './elements/view-elements/view-elements.component';  
import { ImportSourceStationDetailComponent } from './source-templates/import-source-detail/import-source-station-detail/import-source-station-detail.component';
import { ImportSourceElementAndValueDetailComponent } from './source-templates/import-source-detail/import-source-element-and-value-detail/import-source-element-and-value-detail.component';
import { ImportSourcePeriodDetailComponent } from './source-templates/import-source-detail/import-source-period-detail/import-source-period-detail.component';
import { ImportSourceDateDetailComponent } from './source-templates/import-source-detail/import-source-date-detail/import-source-date-detail.component';
import { ImportSourceDelimeterDetailComponent } from './source-templates/import-source-detail/import-source-delimeter-detail/import-source-delimeter-detail.component';
import { ImportSourceLevelDetailComponent } from './source-templates/import-source-detail/import-source-level-detail/import-source-level-detail.component';
import { ImportSourceMissingFlagDetailComponent } from './source-templates/import-source-detail/import-source-missing-flag-detail/import-source-missing-flag-detail.component';
import { ImportSourceFlagDetailComponent } from './source-templates/import-source-detail/import-source-flag-detail/import-source-flag-detail.component';
import { EditElementDialogComponent } from './elements/edit-element-dialog/edit-element-dialog.component'; 
import { QCTestParameterInputDialogComponent } from './qc-tests/qc-test-input-dialog/qc-test-parameter-input-dialog.component';
import { QCTestTypeSingleSelectorComponent } from './qc-tests/qc-test-type-selector/qc-test-type-selector-single/qc-test-type-selector-single.component';
import { QCTestRangeThresholdParamsComponent } from './qc-tests/qc-test-input-dialog/qc-test-range-threshold-params/qc-test-range-threshold-params.component';
import { QCTestFlatLineParamsComponent } from './qc-tests/qc-test-input-dialog/qc-test-flat-line-params/qc-test-flat-line-params.component';
import { QCTestSpikeParamsComponent } from './qc-tests/qc-test-input-dialog/qc-test-spike-params/qc-test-spike-params.component';
import { QCTestRelationalParamsComponent } from './qc-tests/qc-test-input-dialog/qc-test-relational-params/qc-test-relational-params.component';
import { QCTestContextualParamsComponent } from './qc-tests/qc-test-input-dialog/qc-test-contextual-params/qc-test-contextual-params.component';
import { QCTestConditionInputComponent } from './qc-tests/qc-test-input-dialog/qc-test-condition-input/qc-test-condition-input.component';
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
import { StationObsProcessingSingleSelectorComponent } from './stations/station-obs-method-selector/station-obs-processing-selector-single/station-obs-processing-selector-single.component';
import { StationStatusSelectorSingleComponent } from './stations/station-status-selector/station-status-selector-single/station-status-selector-single.component';
import { StationFocusSelectorSingleComponent } from './stations/station-focus-selector/station-focus-selector-single/station-focus-selector-single.component';
import { StationEnvironmentSelectorSingleComponent } from './stations/station-environment-selector/station-environment-selector-single/station-environment-selector-single.component';
import { RegionTypeInputComponent } from './regions/region-type-selector/region-type-input.component';
import { ViewNetworkAffiliationsComponent } from './network-affiliations/view-network-affiliations/view-network-affiliations.component';
import { NetworkAffiliationDetailsComponent } from './network-affiliations/network-affiliation-details/network-affiliation-details.component';
import { OrganisationSelectorSingleComponent } from './organisations/organisation-selector/organisation-selector-single/organisation-selector-single.component'; 
import { ElementTypeSingleInputComponent } from './elements/element-type-single-input/element-type-single-input.component';
import { ViewStationsTreeMapComponent } from './stations/view-stations/view-stations-tree-map/view-stations-tree-map.component';
import { QCStatusSelectorSingleComponent } from './qc-tests/qc-status-selector-single/qc-status-selector-single.component';
import { ExportTypeSelectorSingleComponent } from './export-templates/export-type-selector-single/export-type-selector-single.component';
import { NetworkAffiliationsSelectorSingleComponent } from './network-affiliations/network-affiliations-selector/network-affiliations-selector-single/network-affiliations-selector-single.component';
import { ViewQCTestsComponent } from './qc-tests/view-qc-tests/view-qc-tests.component';
import { RegionSelectorMultipleComponent } from './regions/regions-selector/region-selector-multiple/region-selector-multiple.component';
import { OrganisationSelectorMultipleComponent } from './organisations/organisation-selector/organisation-selector-multiple/organisation-selector-multiple.component';
import { NetworkAffiliationsSelectorMultipleComponent } from './network-affiliations/network-affiliations-selector/network-affiliations-selector-multiple/network-affiliations-selector-multiple.component';
import { StationStatusSelectorMultipleComponent } from './stations/station-status-selector/station-status-selector-multiple/station-status-selector-multiple.component';
import { StationObsProcessingSelectorMultipleComponent } from './stations/station-obs-method-selector/station-obs-processing-selector-multiple/station-obs-processing-selector-multiple.component';
import { StationEnvironmentSelectorMultipleComponent } from './stations/station-environment-selector/station-environment-selector-multiple/station-environment-selector-multiple.component';
import { StationFocusSelectorMultipleComponent } from './stations/station-focus-selector/station-focus-selector-multiple/station-focus-selector-multiple.component';

@NgModule({
  declarations: [ 

    ViewNetworkAffiliationsComponent,
    NetworkAffiliationDetailsComponent, 
    NetworkAffiliationsSelectorMultipleComponent,
    NetworkAffiliationsSelectorSingleComponent,

    ViewOrganisationsComponent,
    OrganisationDetailsComponent,
    OrganisationSelectorSingleComponent,
    OrganisationSelectorMultipleComponent,

    ViewRegionsComponent,
    ViewRegionsTableComponent,
    ViewRegionsMapComponent,
    RegionTypeInputComponent,
    RegionSelectorMultipleComponent,

    ViewSourcesComponent,
    FormSourceDetailComponent,
    ImportSourceDetailComponent,

    ViewStationsComponent, 
    EditStationDialogComponent,
    ImportStationsDialogComponent,

    StationObsProcessingSingleSelectorComponent,
    StationObsProcessingSelectorMultipleComponent,

    StationEnvironmentSelectorSingleComponent,
    StationEnvironmentSelectorMultipleComponent,

    StationFocusSelectorSingleComponent,
    StationFocusSelectorMultipleComponent,

    StationStatusSelectorSingleComponent,
    StationStatusSelectorMultipleComponent,

    ViewStationsTableComponent,
    ViewStationsGeoMapComponent,
    ViewStationsTreeMapComponent,
 

    StationsSearchDialogComponent,
 
    ViewElementsComponent,  
    ImportSourceStationDetailComponent,
    ImportSourceElementAndValueDetailComponent,
    ImportSourcePeriodDetailComponent,
    ImportSourceDateDetailComponent,
    ImportSourceDelimeterDetailComponent,
    ImportSourceLevelDetailComponent,
    ImportSourceMissingFlagDetailComponent,
    ImportSourceFlagDetailComponent,

    EditElementDialogComponent, 
    ImportElementsDialogComponent,
    ElementTypeSingleInputComponent,
    ElementsSearchDialogComponent,

    ElementSelectorSingleComponent,
    ElementSelectorMultipleComponent,

    ImportRegionsDialogComponent,

    StationSelectorMultipleComponent,
    StationSelectorSingleComponent,

    SourceSelectorSingleComponent,
    SourceSelectorMultipleComponent,

    ViewQCTestsComponent, 
    QCTestParameterInputDialogComponent,
    QCTestTypeSingleSelectorComponent,
    QCTestRangeThresholdParamsComponent,
    QCTestFlatLineParamsComponent,
    QCTestSpikeParamsComponent,
    QCTestRelationalParamsComponent,
    QCTestContextualParamsComponent,
    QCTestConditionInputComponent,

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

    NetworkAffiliationsSelectorMultipleComponent,
    NetworkAffiliationsSelectorSingleComponent,

    OrganisationSelectorSingleComponent,
    OrganisationSelectorMultipleComponent,

    RegionTypeInputComponent,
    RegionSelectorMultipleComponent,


    ElementSelectorSingleComponent,
    ElementSelectorMultipleComponent,
    ElementsSearchDialogComponent,
    ElementTypeSingleInputComponent,

    StationObsProcessingSingleSelectorComponent,
    StationObsProcessingSelectorMultipleComponent,

    StationEnvironmentSelectorSingleComponent,
    StationEnvironmentSelectorMultipleComponent,

    StationFocusSelectorSingleComponent,
    StationFocusSelectorMultipleComponent,

    StationStatusSelectorSingleComponent,
    StationStatusSelectorMultipleComponent,

    ViewStationsTableComponent,
    ViewStationsGeoMapComponent,

    StationSelectorMultipleComponent,
    StationSelectorSingleComponent,
    ViewStationsGeoMapComponent,
    ViewStationsTreeMapComponent,

    StationsSearchDialogComponent,

    SourceSelectorSingleComponent,
    SourceSelectorMultipleComponent,

    ExportTemplateSelectorSingleComponent,
    ExportTemplateSelectorMultipleComponent,

    QCStatusSelectorSingleComponent,
    ExportTypeSelectorSingleComponent,
  ]
})
export class MetadataModule { } 
