import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { take } from 'rxjs';
import { DataAvailaibilityDetailsModel } from '../models/data-availability-details.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { DataAvailabilityDetailsQueryModel } from '../models/data-availability-details-query.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { DataAvailabilityFilterModel } from '../data-availability-query-selection/data-availability-filter-selection-general/data-availability-filter-selection-general.component';

// TODO. Refactor this component

interface DataAvailaibilityDetailsView extends DataAvailaibilityDetailsModel {
  stationName: string;
  elementAbbrv: string;
  intervalName: string;
  fromFormattedDatetime: string;
  toFormattedDatetime: string;
}

@Component({
  selector: 'app-data-availability-details',
  templateUrl: './data-availability-details.component.html',
  styleUrls: ['./data-availability-details.component.scss']
})
export class DataAvailabilityDetailsComponent implements OnChanges {

  @Input()
  public filter!: DataAvailabilityFilterModel;

  protected enableQueryButton: boolean = true;

  @Output()
  public enableQueryButtonChange = new EventEmitter<boolean>();

  @Output()
  public filterChange = new EventEmitter<DataAvailabilityFilterModel>();

  protected availabilityDetails: DataAvailaibilityDetailsView[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private observationService: ObservationsService,
    private cachedMetadataService: CachedMetadataService,
  ) {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filter'] && this.filter) {
      this.loadDetails();
    }
  }

  protected onQueryClick(newSummaryFilter: DataAvailabilityFilterModel): void {
    this.filter = newSummaryFilter;
    this.loadDetails();
    this.filterChange.emit(this.filter);
  }

  private loadDetails(): void {
    if (!this.filter.interval) {
      return;
    }

    const detailsFilter: DataAvailabilityDetailsQueryModel = {
      stationIds: this.filter.stationIds,
      elementIds: this.filter.elementIds,
      interval: this.filter.interval,
      level: this.filter.level,
      fromDate: this.filter.fromDate,
      toDate: this.filter.toDate
    };

    this.enableQueryButton = false;
    this.observationService.findDataAvailabilityDetails(detailsFilter).pipe(
      take(1),
    ).subscribe({
      next: data => {
        this.enableQueryButton = true;
        this.availabilityDetails = data.map(details => {
          const stationMetadata = this.cachedMetadataService.getStation(details.stationId);
          const elementMetadata = this.cachedMetadataService.getElement(details.elementId);
          return {
            ...details,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            intervalName: IntervalsUtil.getIntervalName(details.interval),
            fromFormattedDatetime: DateUtils.getPresentableDatetime(details.fromDate, this.cachedMetadataService.utcOffSet),
            toFormattedDatetime: DateUtils.getPresentableDatetime(details.toDate, this.cachedMetadataService.utcOffSet),
          };
        });
      },
      error: err => {
        this.enableQueryButton = true;
        this.pagesDataService.showToast({ title: 'Data Availability Details', message: err, type: ToastEventTypeEnum.ERROR });
      },
    });
  }

}
