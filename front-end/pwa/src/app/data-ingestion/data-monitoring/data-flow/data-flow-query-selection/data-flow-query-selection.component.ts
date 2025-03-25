import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-data-flow-query-selection',
  templateUrl: './data-flow-query-selection.component.html',
  styleUrls: ['./data-flow-query-selection.component.scss']
})
export class DataFlowQuerySelectionComponent implements OnChanges, OnDestroy {

  @Input() public enableQueryButton: boolean = true;

  @Input() public dateRange: DateRange;


  @Output() public queryClick = new EventEmitter<ViewObservationQueryModel>()

  protected stationIds: string[] = [];
  //protected sourceId: number[] = [];
  protected elementId: number = 0;
  protected interval: number = 0;
  protected level: number = 0;
  protected queryAllowed: boolean = true;
  protected includeOnlyStationIds: string[] = [];
  protected errorMessage: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
  ) {

    // Set default dates to 1 year
    const todayDate = new Date();
    const lastDate: Date = new Date();
    lastDate.setDate(todayDate.getDate() - 365);
    this.dateRange = { fromDate: lastDate.toISOString().slice(0, 10), toDate: todayDate.toISOString().slice(0, 10) };

    this.setStationsAllowed();
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setStationsAllowed(): void {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (user.isSystemAdmin) {
        this.includeOnlyStationIds = [];
        return;
      }

      if (!user.permissions) {
        this.queryAllowed = false;
        throw new Error('Developer error. Permissions NOT set.');
      }

      const permissions: UserPermissionModel = user.permissions;
      if (permissions.ingestionMonitoringPermissions) {
        this.includeOnlyStationIds = permissions.ingestionMonitoringPermissions.stationIds ? permissions.ingestionMonitoringPermissions.stationIds : [];
      } else {
        this.queryAllowed = false;
      }
    });
  }

  protected onQueryClick(): void {
    const observationFilter: ViewObservationQueryModel = { deleted: false };;

    // Get the data based on the selection filter

    if (this.stationIds.length > 0) {
      observationFilter.stationIds = this.stationIds;
    }

    if (this.elementId > 0) {
      observationFilter.elementIds = [this.elementId];
    } else {
      this.pagesDataService.showToast({ title: 'Data Flow', message: 'Element selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.interval > 0) {
      observationFilter.interval = this.interval;
    } else {
      this.pagesDataService.showToast({ title: 'Data Flow', message: 'Interval selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    observationFilter.level = this.level;

    // if (this.sourceIds.length > 0) {
    //   observationFilter.sourceIds = this.sourceIds;
    // }


    if (this.dateRange.fromDate) {
      observationFilter.fromDate = `${this.dateRange.fromDate}T00:00:00Z`;
    } else {
      this.pagesDataService.showToast({ title: 'Data Flow', message: 'From date selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.dateRange.toDate) {
      observationFilter.toDate = `${this.dateRange.toDate}T23:00:00Z`;
    } else {
      this.pagesDataService.showToast({ title: 'Data Flow', message: 'To date selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    // Check maximum of 1 year

    if (this.isMoreThanOneCalendarYear(new Date(this.dateRange.fromDate), new Date(this.dateRange.toDate))) {
      this.pagesDataService.showToast({ title: 'Data Flow', message: 'Date range exceeds 1 year', type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.queryClick.emit(observationFilter);
  }

  private isMoreThanOneCalendarYear(fromDate: Date, toDate: Date): boolean {
    const oneYearLater = new Date(fromDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    return toDate > oneYearLater;
  }




}
