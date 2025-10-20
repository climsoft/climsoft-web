import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { DataAvailabilitySummaryQueryModel } from '../../models/data-availability-summary-query.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DataAvailabilityFilterModel, DataAvailabilityFilterSelectionGeneralComponent } from '../../data-availability-query-selection/data-availability-filter-selection-general/data-availability-filter-selection-general.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { DataAvailabilityDetailsQueryModel } from '../../models/data-availability-details-query.model';
import { DurationTypeEnum } from '../../models/duration-type.enum';

@Component({
  selector: 'app-data-availability-filter-selection-details',
  templateUrl: './data-availability-filter-selection-details.component.html',
  styleUrls: ['./data-availability-filter-selection-details.component.scss']
})
export class DataAvailabilityFilterSelectionDetailsComponent implements OnChanges {
  @ViewChild('appDAFilterGDetailsSelection')
  private daGeneralFilterComponent!: DataAvailabilityFilterSelectionGeneralComponent;

  @Input()
  public enableQueryButton: boolean = true;

  @Input()
  public filter!: DataAvailabilityFilterModel;

  @Output()
  public filterChange = new EventEmitter<DataAvailabilityFilterModel>();

  protected startingHour!: number | null;

  constructor(
    private cachedMetadataService: CachedMetadataService,
    private pagesDataService: PagesDataService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filter'] && this.filter) { 
      const time = DateUtils.getDatetimesBasedOnUTCOffset(this.filter.fromDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[1].split(':')[0];
      this.startingHour = Number(time);

    }
  }

  protected onQueryClick(): void {
    // Set the new output filter
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

      let dateOnly = generalFilter.fromDate.split('T')[0];
      const fromDate = DateUtils.getDatetimesBasedOnUTCOffset(
        `${dateOnly}T${StringUtils.addLeadingZero(this.startingHour)}:00:00Z`,
        this.cachedMetadataService.utcOffSet, 'subtract')

      const f: DataAvailabilityDetailsQueryModel = {
        stationIds: generalFilter.stationIds,
        elementIds: generalFilter.elementIds,
        interval: generalFilter.interval,
        level: generalFilter.level,
        fromDate: fromDate,
        toDate: generalFilter.toDate,
      };

      this.filterChange.emit({...f, durationType: generalFilter.durationType});
    }
  }


}
