import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { DataAvailabilitySummaryQueryModel } from '../../models/data-availability-summary-query.model';
import { DataAvailabilityFilterModel, DataAvailabilityFilterSelectionGeneralComponent } from '../../data-availability-query-selection/data-availability-filter-selection-general/data-availability-filter-selection-general.component';

@Component({
  selector: 'app-data-availability-filter-selection-summary',
  templateUrl: './data-availability-filter-selection-summary.component.html',
  styleUrls: ['./data-availability-filter-selection-summary.component.scss']
})
export class DataAvailabilityFilterSelectionSummaryComponent implements OnChanges {
  @ViewChild('appDAFilterGSummarySelection')
  private daGeneralFilterComponent!: DataAvailabilityFilterSelectionGeneralComponent;

  @Input()
  public enableQueryButton: boolean = true;

  @Input()
  public filter!: DataAvailabilitySummaryQueryModel;

  @Output()
  public filterChange = new EventEmitter<DataAvailabilitySummaryQueryModel>();

  public generalFilter!: DataAvailabilityFilterModel;
  protected excludeMissingValues: boolean = false;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filter'] && this.filter) {
      this.generalFilter = { ...this.filter };
      if (this.filter.excludeConfirmedMissing !== undefined) this.excludeMissingValues = this.filter.excludeConfirmedMissing;
    }
  }

  protected onQueryClick(): void {
    // Set the new output filter
    const generalFilter = this.daGeneralFilterComponent.getFilterFromSelections();
    if (generalFilter) {
      this.filter = { ...generalFilter };
      if (this.excludeMissingValues) this.filter.excludeConfirmedMissing = this.excludeMissingValues;
      this.filterChange.emit(generalFilter);
    }
  }

}
