import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { Subject, take, takeUntil } from 'rxjs';
import { DuplicateModel, SourceCheckService } from '../../data-ingestion/services/source-check.service';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';

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
  private queryFilter!: ViewObservationQueryModel;
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
    this.pagesDataService.setPageHeader('Source Check');
    // Get the climsoft time zone display setting
    this.generalSettingsService.findOne(SettingIdEnum.DISPLAY_TIME_ZONE).pipe(
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
    this.queryFilter = observationFilter;
    this.queryData();
  }

  private queryData(): void {
    this.enableQueryButton = false;
    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0)
    this.sourceCheckService.count(this.queryFilter).pipe(
      take(1))
      .subscribe({
        next: count => {
          this.enableQueryButton = true;
          this.pageInputDefinition.setTotalRowCount(count);
          if (count > 0) {
            this.loadData();
            this.sourceCheckService.sum(this.queryFilter).pipe(take(1)).subscribe(sum => {
              this.sumOfDuplicates = sum;
            });
          } else {
            this.pagesDataService.showToast({ title: 'Source Check', message: 'No data', type: ToastEventTypeEnum.INFO });
          }
        },
        error: err => {
          this.enableQueryButton = true;
          this.pagesDataService.showToast({ title: 'Source Check', message: err, type: ToastEventTypeEnum.ERROR });
        },
      });

  }

  protected loadData(): void {
    this.enableQueryButton = false;
    this.sumOfDuplicates = 0;
    this.observationsEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;
    this.sourceCheckService.find(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.enableQueryButton = true;
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
        this.enableQueryButton = true;
        this.pagesDataService.showToast({ title: 'Delete Data', message: err, type: ToastEventTypeEnum.ERROR });
      },
    });
  }


}
