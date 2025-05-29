import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { DataAvailabilityQueryModel } from '../models/data-availability-query.model';

@Component({
  selector: 'app-data-availability-query-selection',
  templateUrl: './data-availability-query-selection.component.html',
  styleUrls: ['./data-availability-query-selection.component.scss']
})
export class DataAvailabilityQuerySelectionComponent implements OnDestroy {
  @Input() public enableQueryButton: boolean = true;
  @Output() public queryClick = new EventEmitter<DataAvailabilityQueryModel>()

  protected dataAvailabilityFilter: DataAvailabilityQueryModel;
  protected queryAllowed: boolean = true;
  protected includeOnlyStationIds: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
  ) {

    const todayDate = new Date();

    this.dataAvailabilityFilter = {
      stationIds: [],
      elementIds: [],
      interval: 0,
      durationType: 'days_of_month',
      durationDaysOfMonth: todayDate.toISOString().slice(0, 7),
      durationMonthsOfYear: todayDate.getFullYear(),
      durationYears: [todayDate.getFullYear()],
    }

    this.setStationsAllowed();
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

  protected onDurationChange(option: string): void {
    switch (option) {
      case 'Days of Month':
        this.dataAvailabilityFilter.durationType = 'days_of_month';
        break;
      case 'Months of Year':
        this.dataAvailabilityFilter.durationType = 'months_of_year';
        break;
      case 'Years':
        this.dataAvailabilityFilter.durationType = 'years';
        break;
      default:
        // TODO. developer error
        break;
    }
  }

  protected onQueryClick(): void {

    if (this.dataAvailabilityFilter.stationIds.length === 0) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Station selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    // if (this.dataAvailabilityFilter.elementIds.length <= 0) {
    //   this.pagesDataService.showToast({ title: 'Data Availability', message: 'Element selection required', type: ToastEventTypeEnum.ERROR });
    //   return;
    // }

    // if (this.dataAvailabilityFilter.interval <= 0) {
    //   this.pagesDataService.showToast({ title: 'Data Availability', message: 'Interval selection required', type: ToastEventTypeEnum.ERROR });
    //   return;
    // }

    if (!this.dataAvailabilityFilter.durationType) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Duration Type selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.dataAvailabilityFilter.durationType === 'days_of_month' && !this.dataAvailabilityFilter.durationDaysOfMonth) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Days of month selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.dataAvailabilityFilter.durationType === 'months_of_year' && !this.dataAvailabilityFilter.durationMonthsOfYear) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Months of year selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.dataAvailabilityFilter.durationType === 'years' && (!this.dataAvailabilityFilter.durationYears || this.dataAvailabilityFilter.durationYears.length === 0)) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Years selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }




    this.queryClick.emit(this.dataAvailabilityFilter);
  }

  private isMoreThanOneCalendarYear(fromDate: Date, toDate: Date): boolean {
    const oneYearLater = new Date(fromDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    return toDate > oneYearLater;
  }




}
