import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { Subject, take, takeUntil } from 'rxjs';
import { DuplicateModel, SourceCheckService } from '../../services/source-check.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { Interval, IntervalsUtil } from 'src/app/shared/controls/period-input/interval-single-input/Intervals.util';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';

export interface SourceCheckViewModel extends DuplicateModel {
  stationName: string;
  elementAbbrv: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-source-check',
  templateUrl: './source-check.component.html',
  styleUrls: ['./source-check.component.scss']
})
export class SourceCheckComponent implements OnDestroy {

  protected totalRecords: number = 0;


  protected observationsEntries: SourceCheckViewModel[] = [];

  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private observationFilter!: ViewObservationQueryModel;
  protected enableQueryButton: boolean = true;
  protected sumOfDuplicates: number = 0;
  protected includeOnlyStationIds: string[] = [];
  private utcOffset: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private sourceCheckService: SourceCheckService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private generalSettingsService: GeneralSettingsService,
  ) {
    // Get the climsoft time zone display setting
    this.generalSettingsService.findOne(2).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return SourceCheckComponent.name;
  }

  protected onQueryClick(observationFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.observationFilter = observationFilter;
    this.queryData();
  }




  private queryData(): void {
    this.enableQueryButton = false;
    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0)
    this.sourceCheckService.count(this.observationFilter).pipe(
      take(1))
      .subscribe({
        next: count => {
          this.enableQueryButton = true;
          this.pageInputDefinition.setTotalRowCount(count);
          if (count > 0) {
            this.loadData();
            this.sourceCheckService.sum(this.observationFilter).pipe(take(1)).subscribe(sum => {
              this.sumOfDuplicates = sum;
            });
          } else {
            this.pagesDataService.showToast({ title: 'Source Check', message: 'No data', type: ToastEventTypeEnum.INFO });
          }
        },
        error: err => {
          this.pagesDataService.showToast({ title: 'Source Check', message: err, type: ToastEventTypeEnum.ERROR });
        },
        complete: () => {
          this.enableQueryButton = true;
        }
      });

  }

  protected loadData(): void {
    this.enableQueryButton = false;
    this.sumOfDuplicates = 0;
    this.observationsEntries = [];
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;
    this.sourceCheckService.find(this.observationFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.observationsEntries = data.map(duplicate => { 
          const stationMetadata = this.cachedMetadataSearchService.getStation(duplicate.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(duplicate.elementId);

          const entry: SourceCheckViewModel = {
            ...duplicate,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(duplicate.datetime, this.utcOffset),
            intervalName: IntervalsUtil.getIntervalName(duplicate.interval)
          }

          return entry;
        });
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Delete Data', message: err, type: ToastEventTypeEnum.ERROR });
      },
      complete: () => {
        this.enableQueryButton = true;
      }
    });
  }


}
