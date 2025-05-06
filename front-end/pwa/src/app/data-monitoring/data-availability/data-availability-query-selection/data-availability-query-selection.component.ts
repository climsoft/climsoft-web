import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core'; 
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { DataAvailabilityQueryModel } from '../models/data-availability-query.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-data-availability-query-selection',
  templateUrl: './data-availability-query-selection.component.html',
  styleUrls: ['./data-availability-query-selection.component.scss']
})
export class DataAvailabilityQuerySelectionComponent implements OnDestroy {
  @Input() public enableQueryButton: boolean = true;
  @Output() public queryClick = new EventEmitter<DataAvailabilityQueryModel>()

  protected dataAvailabilityFilter: DataAvailabilityQueryModel ;
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
      elementId: 0,
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
   
    if (this.dataAvailabilityFilter.elementId <= 0) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Element selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }  

    if (this.dataAvailabilityFilter.interval <= 0) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Interval selection required', type: ToastEventTypeEnum.ERROR });
      return;
    } 

    if (!this.dataAvailabilityFilter.durationType) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Duration Type selection required', type: ToastEventTypeEnum.ERROR });
      return;
    } 


    
    // Check maximum of 1 year

    // if (this.isMoreThanOneCalendarYear(new Date(this.dateRange.fromDate), new Date(this.dateRange.toDate))) {
    //   this.pagesDataService.showToast({ title: 'Data Flow', message: 'Date range exceeds 1 year', type: ToastEventTypeEnum.ERROR });
    //   return;
    // }

    console.log('filter: ', this.dataAvailabilityFilter);

     this.queryClick.emit(this.dataAvailabilityFilter);
  }

  private isMoreThanOneCalendarYear(fromDate: Date, toDate: Date): boolean {
    const oneYearLater = new Date(fromDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    return toDate > oneYearLater;
  }




}
