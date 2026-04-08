import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { DataAvailabilitySummaryQueryModel } from '../models/data-availability-summary-query.model';
import { DataAvailabilityHeatmapComponent, DataAvailabilityCellClickEvent } from '../data-availability-heatmap/data-availability-heatmap.component';
import { DataAvailabilityDetailsDialogComponent } from '../data-availability-details-dialog/data-availability-details-dialog.component';

@Component({
  selector: 'app-data-availability-summary',
  templateUrl: './data-availability-summary.component.html',
  styleUrls: ['./data-availability-summary.component.scss']
})
export class DataAvailabilitySummaryComponent implements AfterViewInit, OnChanges {
  @ViewChild('heatmap') private heatmap!: DataAvailabilityHeatmapComponent;
  @ViewChild('detailsDialog') private detailsDialog!: DataAvailabilityDetailsDialogComponent;

  @Input() public stationsPermitted!: StationCacheModel[];
  @Input() public filter!: DataAvailabilitySummaryQueryModel;

  @Output() public filterChange = new EventEmitter<DataAvailabilitySummaryQueryModel>();

  protected enableQueryButton = true;

  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.filter && this.stationsPermitted) {
      this.heatmap.executeQuery(this.filter, this.stationsPermitted);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['filter'] || changes['stationsPermitted']) && this.filter && this.stationsPermitted && this.viewInitialized) {
      this.heatmap.executeQuery(this.filter, this.stationsPermitted);
    }
  }

  protected onQueryClick(newFilter: DataAvailabilitySummaryQueryModel): void {
    this.filter = newFilter;
    this.filterChange.emit(this.filter);
    this.heatmap.executeQuery(this.filter, this.stationsPermitted);
  }

  protected onLoadingChange(loading: boolean): void {
    this.enableQueryButton = !loading;
  }

  protected onCellClick(event: DataAvailabilityCellClickEvent): void {
    this.detailsDialog.openDialog(event.derivedFilter, this.stationsPermitted, event.hideDrillDown);
  }
}
