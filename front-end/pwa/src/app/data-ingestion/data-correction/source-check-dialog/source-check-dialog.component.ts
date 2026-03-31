import { Component, OnDestroy } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewObservationQueryModel } from '../../models/view-observation-query.model';
import { SourceCheckDuplicateModel } from '../../models/source-check-duplicate.model';
import { SourceCheckService } from '../../services/source-check.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { IntervalsUtil } from 'src/app/shared/controls/interval-selector/Intervals.util';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { Router } from '@angular/router';
import { AppAuthService } from 'src/app/app-auth.service';
import { LoggedInUserModel } from 'src/app/admin/users/models/logged-in-user.model';
import { NumberUtils } from 'src/app/shared/utils/number.utils';

export interface SourceCheckViewModel extends SourceCheckDuplicateModel {
  stationName: string;
  elementAbbrv: string;
  formattedDatetime: string;
  intervalName: string;
}

@Component({
  selector: 'app-source-check-dialog',
  templateUrl: './source-check-dialog.component.html',
  styleUrls: ['./source-check-dialog.component.scss']
})
export class SourceCheckDialogComponent implements OnDestroy {

  protected open = false;
  protected loading = false;
  protected duplicateEntries: SourceCheckViewModel[] = [];
  protected pageInputDefinition = new PagingParameters();

  private queryFilter!: ViewObservationQueryModel;
  private user!: LoggedInUserModel;
  private destroy$ = new Subject<void>();

  constructor(
    private sourceCheckService: SourceCheckService,
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataService,
    private appAuthService: AppAuthService,
    private router: Router,
  ) {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (user) this.user = user;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public openDialog(filter: ViewObservationQueryModel): void {
    this.open = true;
    this.duplicateEntries = [];
    this.pageInputDefinition = new PagingParameters();
    this.queryFilter = { ...filter };
    this.queryData();
  }

  private queryData(): void {
    this.loading = true;
    this.duplicateEntries = [];
    this.pageInputDefinition.setTotalRowCount(0);

    this.sourceCheckService.count(this.queryFilter).pipe(take(1)).subscribe({
      next: count => {
        this.pageInputDefinition.setTotalRowCount(count);
        if (count > 0) {
          this.loadData();
        } else {
          this.loading = false;
        }
      },
      error: err => {
        this.loading = false;
        this.pagesDataService.showToast({
          title: 'Source Check',
          message: err.error?.message || 'Failed to count duplicates',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }

  protected loadData(): void {
    this.loading = true;
    this.duplicateEntries = [];
    this.queryFilter.page = this.pageInputDefinition.page;
    this.queryFilter.pageSize = this.pageInputDefinition.pageSize;

    this.sourceCheckService.find(this.queryFilter).pipe(take(1)).subscribe({
      next: data => {
        this.loading = false;
        this.duplicateEntries = data.map(duplicate => {
          const stationMetadata = this.cachedMetadataSearchService.getStation(duplicate.stationId);
          const elementMetadata = this.cachedMetadataSearchService.getElement(duplicate.elementId);

          return {
            ...duplicate,
            stationName: stationMetadata.name,
            elementAbbrv: elementMetadata.name,
            formattedDatetime: DateUtils.getPresentableDatetime(duplicate.datetime, this.cachedMetadataSearchService.utcOffSet),
            intervalName: IntervalsUtil.getIntervalName(duplicate.interval),
          };
        });
      },
      error: err => {
        this.loading = false;
        this.pagesDataService.showToast({
          title: 'Source Check',
          message: err.error?.message || 'Failed to load duplicates',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }

  protected onRowClick(entry: SourceCheckViewModel): void {
    const viewFilter: ViewObservationQueryModel = {
      stationIds: [entry.stationId],
      elementIds: [entry.elementId],
      level: entry.level,
      intervals: [entry.interval],
      fromDate: entry.datetime,
      toDate: entry.datetime,
    };

    let componentPath = '';
    if (this.user.isSystemAdmin) {
      componentPath = 'data-ingestion/data-correction';
    } else if (this.user.permissions) {
      if (this.user.permissions.entryPermissions) {
        componentPath = 'data-ingestion/data-correction';
      } else if (this.user.permissions.ingestionMonitoringPermissions) {
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

  protected onClose(): void {
    this.open = false;
  }

  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }
}
