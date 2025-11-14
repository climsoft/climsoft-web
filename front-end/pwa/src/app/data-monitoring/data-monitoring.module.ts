
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { DataMonitoringRoutingModule } from './data-monitoring-routing.module';
import { stationStatusComponent } from './station-status/stations-status.component';
import { DataFlowComponent } from './data-flow/data-flow.component';
import { DataExplorerComponent } from './data-explorer/data-explorer.component';
import { StationDataComponent } from './station-status/station-status-data/station-status-data.component';
import { DataFlowQuerySelectionComponent } from './data-flow/data-flow-query-selection/data-flow-query-selection.component';
import { ObservationsModule } from '../observations/observations.module';
import { StationStatusQuerySelectionComponent } from './station-status/station-status-query-selection/station-status-query-selection.component';
import { DataIngestionModule } from '../data-ingestion/data-ingestion.module';
import { DataAvailabilityComponent } from './data-availability/data-availability.component';
import { DataAvailabilityDetailsComponent } from './data-availability/data-availability-details/data-availability-details.component';
import { DataAvailabilityOptionsDialogComponent } from './data-availability/data-availability-options-dialog/data-availability-options-dialog.component';
import { DataAvailabilityFilterSelectionSummaryComponent } from './data-availability/data-availability-summary/data-availability-filter-selection-summary/data-availability-filter-selection-summary.component';
import { DataAvailabilityFilterSelectionDetailsComponent } from './data-availability/data-availability-details/data-availability-filter-selection-details/data-availability-filter-selection-details.component';
import { DataAvailabilitySummaryComponent } from './data-availability/data-availability-summary/data-availability-summary.component';
import { DataAvailabilityFilterSelectionGeneralComponent } from './data-availability/data-availability-filter-selection-general/data-availability-filter-selection-general.component';

@NgModule({
  declarations: [
    stationStatusComponent,
    StationStatusQuerySelectionComponent,
    StationDataComponent,
    DataFlowComponent,
    DataFlowQuerySelectionComponent,
    DataAvailabilityComponent,
    DataAvailabilityFilterSelectionGeneralComponent,
    DataAvailabilityFilterSelectionSummaryComponent,
    DataAvailabilityFilterSelectionDetailsComponent,
    DataAvailabilitySummaryComponent,
    DataAvailabilityDetailsComponent,
    DataAvailabilityOptionsDialogComponent,
    DataExplorerComponent,
  ],
  imports: [
    DataMonitoringRoutingModule,
    SharedModule,
    MetadataModule, 
    ObservationsModule,
    DataIngestionModule,
  ]
})
export class DataMonitoringModule { }
