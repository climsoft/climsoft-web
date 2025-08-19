import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { Subject, take, takeUntil } from 'rxjs';
import { QualityControlService } from '../../data-ingestion/services/quality-control.service';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { Router } from '@angular/router';
import { AppAuthService } from 'src/app/app-auth.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { SourceCheckDuplicateModel } from 'src/app/data-ingestion/models/source-check-duplicate.model';

export interface SourceCheckViewModel extends SourceCheckDuplicateModel {
  stationName: string;
  elementAbbrv: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-source-checks',
  templateUrl: './source-checks.component.html',
  styleUrls: ['./source-checks.component.scss']
})
export class SourceChecksComponent implements OnDestroy {

  protected totalRecords: number = 0;
  protected duplicateEntries: SourceCheckViewModel[] = [];

  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private queryFilter!: ViewObservationQueryModel;
  protected enableQueryButton: boolean = true;
  protected includeOnlyStationIds: string[] = [];
  private utcOffset: number = 0;
  private user!: LoggedInUserModel;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private qualityControlService: QualityControlService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private generalSettingsService: GeneralSettingsService,
    private router: Router,
  ) {
    this.pagesDataService.setPageHeader('Source Checks');

    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      this.user = user;
    });

    // Get the climsoft time zone display setting
    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (allMetadataLoaded) {
        this.utcOffset = this.cachedMetadataSearchService.getUTCOffSet();
      }

    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get componentName(): string {
    return SourceChecksComponent.name;
  }

  protected onQueryClick(queryFilter: ViewObservationQueryModel): void {
    // Get the data based on the selection filter
    this.queryFilter = queryFilter;
    this.queryData();
  }

  private queryData(): void {
    this.enableQueryButton = false;
    this.duplicateEntries = [];
    this.pageInputDefinition.setTotalRowCount(0)
    this.qualityControlService.countDuplicates(this.queryFilter).pipe(
      take(1))
      .subscribe({
        next: count => {
          this.enableQueryButton = true;
          this.pageInputDefinition.setTotalRowCount(count);
          if (count > 0) {
            this.loadData();
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
    this.duplicateEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;
    this.qualityControlService.findDuplicates(this.queryFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.enableQueryButton = true;
        this.duplicateEntries = data.map(duplicate => {
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

  protected onEditDuplicate(duplicateEntry: SourceCheckViewModel): void {
    const viewFilter: ViewObservationQueryModel = {
      stationIds: [duplicateEntry.stationId],
      elementIds: [duplicateEntry.elementId],
      level: duplicateEntry.level,
      intervals: [duplicateEntry.interval],
      fromDate: duplicateEntry.datetime,
      toDate: duplicateEntry.datetime,
    };

    let componentPath: string = '';
    if (this.user.isSystemAdmin) {
      // For admins just open data correction
      componentPath = 'data-ingestion/data-correction';
    } else if (this.user.permissions) {
      if (this.user.permissions.entryPermissions) {
        // If user has correction permissions then just open data correction      
        componentPath = 'data-ingestion/data-correction';
      } else if (this.user.permissions.ingestionMonitoringPermissions) {
        // If user has monitorig permissions then just open data explorer 
        componentPath = '/data-monitoring/data-explorer';
      }
    }

    if (componentPath) {
      const serialisedUrl = this.router.serializeUrl(
        this.router.createUrlTree([componentPath], { queryParams: viewFilter })
      );

      window.open(serialisedUrl, '_blank');
    }

  }


}
