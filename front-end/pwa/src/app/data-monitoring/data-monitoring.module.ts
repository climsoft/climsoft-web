
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { DataMonitoringRoutingModule } from './data-monitoring-routing.module';
import { stationStatusComponent } from './station-status/stations-status.component';
import { DataFlowComponent } from './data-flow/data-flow.component';
import { DataExplorerComponent } from './data-explorer/data-explorer.component';
import { StationDataComponent } from './station-status/station-status-data/station-status-data.component';
import { DataFlowQuerySelectionComponent } from './data-flow/data-flow-query-selection/data-flow-query-selection.component';
import { StationStatusQuerySelectionComponent } from './station-status/station-status-query-selection/station-status-query-selection.component';
import { DataIngestionModule } from '../data-ingestion/data-ingestion.module';
import { DataAvailabilityComponent } from './data-availability/data-availability.component';
import { DataAvailabilityDetailsComponent } from './data-availability/data-availability-details/data-availability-details.component';
import { DataAvailabilitySummaryComponent } from './data-availability/data-availability-summary/data-availability-summary.component';
import { DataAvailabilityFilterSelectionGeneralComponent } from './data-availability/data-availability-filter-selection-general/data-availability-filter-selection-general.component';
import { DataAvailabilityHeatmapComponent } from './data-availability/data-availability-summary/data-availability-heatmap/data-availability-heatmap.component';
import { DataAvailabilityDetailsDialogComponent } from './data-availability/data-availability-summary/data-availability-details-dialog/data-availability-details-dialog.component';

@NgModule({
  declarations: [
    stationStatusComponent,
    StationStatusQuerySelectionComponent,
    StationDataComponent,
    DataFlowComponent,
    DataFlowQuerySelectionComponent,
    DataAvailabilityComponent,
    DataAvailabilityFilterSelectionGeneralComponent,
    DataAvailabilitySummaryComponent,
    DataAvailabilityDetailsComponent,
    DataAvailabilityHeatmapComponent,
    DataAvailabilityDetailsDialogComponent,
    DataExplorerComponent,
  ],
  imports: [
    DataMonitoringRoutingModule,
    SharedModule,
    MetadataModule,
    DataIngestionModule,
  ]
})
export class DataMonitoringModule { }
