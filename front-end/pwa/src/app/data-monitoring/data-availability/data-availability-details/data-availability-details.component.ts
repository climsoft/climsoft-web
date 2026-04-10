import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { DataAvailaibilityDetailsModel } from '../models/data-availability-details.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { DataAvailabilityDetailsQueryModel } from '../models/data-availability-details-query.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { IntervalsUtil } from 'src/app/shared/controls/interval-selector/Intervals.util';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { DataAvailabilityFilterModel, DataAvailabilityFilterSelectionGeneralComponent } from '../data-availability-filter-selection-general/data-availability-filter-selection-general.component';
import { DurationTypeEnum } from '../models/duration-type.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

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
export class DataAvailabilityDetailsComponent {
  @ViewChild('appDAFilterGDetailsSelection') private daGeneralFilterComponent!: DataAvailabilityFilterSelectionGeneralComponent;

  protected enableQueryButton: boolean = true;

  @Output()
  public enableQueryButtonChange = new EventEmitter<boolean>();


  protected availabilityDetails: DataAvailaibilityDetailsView[] = [];
  protected generalFilter!: DataAvailabilityFilterModel;
  protected startingHour!: number| null;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private observationService: ObservationsService,
    private cachedMetadataService: CachedMetadataService,
  ) {

    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      const fromDate = DateUtils.getDatetimesBasedOnUTCOffset(new Date().toISOString(), this.cachedMetadataService.utcOffSet, 'subtract');
      this.generalFilter = {
        interval: 5,
        durationType: DurationTypeEnum.DAY,
        fromDate: fromDate,
        toDate: fromDate,
      }
      this.startingHour = 0;
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  protected onQueryClick(): void {
    const generalFilter = this.daGeneralFilterComponent.getFilterFromSelections();
    if (generalFilter) {
      if (!generalFilter.interval) {
        this.pagesDataService.showToast({ title: 'Data Availability', message: 'Interval selection is required.', type: ToastEventTypeEnum.ERROR });
        return;
      }

      if (this.startingHour === null) {
        this.pagesDataService.showToast({ title: 'Data Availability', message: 'Hour selection is required.', type: ToastEventTypeEnum.ERROR });
        return;
      }
    } else {
      return;
    }

    let dateOnly = generalFilter.fromDate.split('T')[0];
    const fromDate = DateUtils.getDatetimesBasedOnUTCOffset(`${dateOnly}T${StringUtils.addLeadingZero(this.startingHour)}:00:00.000Z`, this.cachedMetadataService.utcOffSet, 'subtract')

    const detailsFilter: DataAvailabilityDetailsQueryModel = {
      stationIds: generalFilter.stationIds,
      elementIds: generalFilter.elementIds,
      interval: generalFilter.interval,
      level: generalFilter.level,
      fromDate: fromDate,
      toDate: generalFilter.toDate
    };

    this.enableQueryButton = false;

    this.observationService.findDataAvailabilityDetails(detailsFilter).pipe(
      take(1),
    ).subscribe({
      next: (data) => {
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
      error: (err) => {
        this.enableQueryButton = true;
        this.pagesDataService.showToast({ title: 'Data Availability Details', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });
  }

}
