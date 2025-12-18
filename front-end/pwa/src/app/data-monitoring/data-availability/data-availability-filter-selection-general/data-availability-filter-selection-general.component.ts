import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/permissions/user-permission.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { StringUtils } from 'src/app/shared/utils/string.utils'; 
import { DurationTypeEnum } from '../models/duration-type.enum';

// TODO. Needs to be refactored.

export interface DataAvailabilityFilterModel {
  stationIds?: string[];
  elementIds?: number[];
  interval?: number;
  level?: number;
  durationType: DurationTypeEnum;
  fromDate: string;
  toDate: string;
}

@Component({
  selector: 'app-data-availability-filter-selection-general',
  templateUrl: './data-availability-filter-selection-general.component.html',
  styleUrls: ['./data-availability-filter-selection-general.component.scss']
})
export class DataAvailabilityFilterSelectionGeneralComponent implements OnChanges, OnDestroy {
  @Input()
  public enableQueryButton: boolean = true;

  @Input()
  public inputFilter!: DataAvailabilityFilterModel;

  @Output()
  public queryClick = new EventEmitter<DataAvailabilityFilterModel>();

  protected stationIds: string[] = [];
  protected sourceIds: number[] = [];
  protected elementIds: number[] = [];
  protected interval: number | null = null;
  protected level: number | null = 0;
  protected durationTypeEnum: typeof DurationTypeEnum = DurationTypeEnum; // used by the template
  protected durationType: DurationTypeEnum = DurationTypeEnum.DAY;
  protected durationDay: string;
  protected durationMonth: string;
  protected durationYear: number;
  protected durationYears: [number, number];
  protected outputFilter!: DataAvailabilityFilterModel;
  protected queryAllowed: boolean = true;
  protected includeOnlyStationIds: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private cachedMetadataService: CachedMetadataService,
  ) {

    // Set the defaults of date selectors from today date
    const todayDate = new Date();
    const [year, month, day] = DateUtils.getDateOnlyAsString(todayDate).split("-");
    this.durationDay = `${year}-${month}-${day}`;
    this.durationMonth = `${year}-${month}`;
    this.durationYear = Number(year);
    this.durationYears = [Number(year) - 10, Number(year)];

    this.setStationsAllowed();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inputFilter'] && this.inputFilter && this.inputFilter !== this.outputFilter) {
      if (this.outputFilter) {
        if (this.areFiltersEqual(this.inputFilter, this.outputFilter)) {
          console.log('inputFilter are equal');
          return;
        }
      }

      console.log('setting outputFilter');
      this.outputFilter = { ...this.inputFilter };
      this.setSelectionsFromQuery();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private areFiltersEqual(
    filter1: DataAvailabilityFilterModel,
    filter2: DataAvailabilityFilterModel
  ): boolean {
    // Compare primitive values
    if (
      filter1.interval !== filter2.interval ||
      filter1.level !== filter2.level ||
      filter1.durationType !== filter2.durationType ||
      filter1.fromDate !== filter2.fromDate ||
      filter1.toDate !== filter2.toDate
    ) {
      return false;
    }

    // Compare arrays
    return (
      this.areArraysEqualUnordered(filter1.stationIds, filter2.stationIds) &&
      this.areArraysEqualUnordered(filter1.elementIds, filter2.elementIds)
    );
  }

  private areArraysEqualUnordered<T>(arr1?: T[], arr2?: T[]): boolean {
    if (arr1 === arr2) return true;
    if (!arr1 || !arr2) return false;
    if (arr1.length !== arr2.length) return false;

    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();

    return sorted1.every((val, index) => val === sorted2[index]);
  }

  private setSelectionsFromQuery() {
    if (this.outputFilter.stationIds) this.stationIds = this.outputFilter.stationIds;
    if (this.outputFilter.elementIds) this.elementIds = this.outputFilter.elementIds;
    if (this.outputFilter.level) this.level = this.outputFilter.level;
    if (this.outputFilter.interval) this.interval = this.outputFilter.interval;

    this.durationType = this.outputFilter.durationType;
    const fromDate = DateUtils.getDatetimesBasedOnUTCOffset(this.outputFilter.fromDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
    const toDate = DateUtils.getDatetimesBasedOnUTCOffset(this.outputFilter.toDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
    const [fromYear, fromMonth, fromDay] = fromDate.split('-');

    switch (this.durationType) {
      case DurationTypeEnum.DAY:
        this.durationDay = `${fromYear}-${fromMonth}-${fromDay}`;
        break;
      case DurationTypeEnum.MONTH:
        this.durationMonth = `${fromYear}-${fromMonth}`;
        break;
      case DurationTypeEnum.YEAR:
        this.durationYear = Number(fromYear);
        break;
      case DurationTypeEnum.YEARS:
        this.durationYears = [Number(fromYear), Number(toDate.split('-')[0])];
        break;
      default:
        throw new Error('Developer error. Duration type not supported');
    }

  }

  // TODO. remove this. It's already being done at the parent component
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
      case 'Day':
        this.durationType = DurationTypeEnum.DAY;
        break;
      case 'Month':
        this.durationType = DurationTypeEnum.MONTH;
        break;
      case 'Year':
        this.durationType = DurationTypeEnum.YEAR;
        break;
      case 'Years':
        this.durationType = DurationTypeEnum.YEARS;
        break;
      default:
        throw new Error('Developer error. Duration option not supported.');
    }
  }

  public getFilterFromSelections(): DataAvailabilityFilterModel | null {
    let fromDate: string;
    let toDate: string;
    switch (this.durationType) {
      case DurationTypeEnum.DAY:
        fromDate = this.durationDay;
        toDate = fromDate;
        break;
      case DurationTypeEnum.MONTH:
        // Calcualte last day of the month.
        // Note. month retrived is 1-index based while Date constructor expects 0-index based.
        // So day 0 of next month = last day of this month
        const [year, month] = this.durationMonth.split('-').map(Number);
        const daysInMonth: number = new Date(year, month, 0).getDate();
        fromDate = `${this.durationMonth}-01`;
        toDate = `${this.durationMonth}-${StringUtils.addLeadingZero(daysInMonth)}`;
        break;
      case DurationTypeEnum.YEAR:
        fromDate = `${this.durationYear}-01-01`;
        toDate = `${this.durationYear}-12-31`;
        break;
      case DurationTypeEnum.YEARS:
        fromDate = `${this.durationYears[0]}-01-01`;
        toDate = `${this.durationYears[1]}-12-31`;
        break;
      default:
        this.pagesDataService.showToast({ title: 'Data Availability', message: 'Developer error. Duration type not supported', type: ToastEventTypeEnum.ERROR });
        throw new Error('Developer error. Duration type not supported');
    }

    // Subtracts the offset to get UTC time if offset is plus and adds the offset to get UTC time if offset is minus
    // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
    fromDate = DateUtils.getDatetimesBasedOnUTCOffset(`${fromDate}T00:00:00Z`, this.cachedMetadataService.utcOffSet, 'subtract');
    toDate = DateUtils.getDatetimesBasedOnUTCOffset(`${toDate}T23:59:00Z`, this.cachedMetadataService.utcOffSet, 'subtract');

    if (new Date(fromDate) > new Date(toDate)) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'From date cannot be greater than to date.', type: ToastEventTypeEnum.ERROR });
      return null;
    } else if (DateUtils.isMoreThanMaxCalendarYears(new Date(fromDate), new Date(toDate), 31)) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Only a maximum of 30 years is allowed.', type: ToastEventTypeEnum.ERROR });
      return null;
    }

    // Set the new output filter
    this.outputFilter = {
      durationType: this.durationType,
      fromDate: fromDate,
      toDate: toDate,
    };

    if (this.stationIds.length > 0) this.outputFilter.stationIds = this.stationIds;
    if (this.elementIds.length > 0) this.outputFilter.elementIds = this.elementIds;
    if (this.level !== null) this.outputFilter.level = this.level;
    if (this.interval !== null) this.outputFilter.interval = this.interval;

    return this.outputFilter;
  }

}
