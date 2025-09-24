import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { DataAvailabilityQueryModel, DurationTypeEnum } from '../models/data-availability-query.model';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-data-availability-query-selection',
  templateUrl: './data-availability-query-selection.component.html',
  styleUrls: ['./data-availability-query-selection.component.scss']
})
export class DataAvailabilityQuerySelectionComponent implements OnChanges, OnDestroy {
  @Input() public enableQueryButton: boolean = true;
  @Input() public inputFilter!: DataAvailabilityQueryModel;
  @Output() public queryClick = new EventEmitter<DataAvailabilityQueryModel>()

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
  protected excludeMissingValues: boolean = false;
  protected outputFilter!: DataAvailabilityQueryModel;
  protected queryAllowed: boolean = true;
  protected includeOnlyStationIds: string[] = [];
  private utcOffset!: number;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
  ) {

    // Set the defaults of date selectors from today date
    const todayDate = new Date();
    const [year, month, day] = DateUtils.getDateOnlyAsString(todayDate).split("-");
    this.durationDay = `${year}-${month}-${day}`;
    this.durationMonth = `${year}-${month}`;
    this.durationYear = Number(year);
    this.durationYears = [Number(year) - 10, Number(year)];

    // Load the utc offset metadata
    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.utcOffset = this.cachedMetadataSearchService.getUTCOffSet();
      this.setSelectionsFromQuery();
    });

    this.setStationsAllowed();
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['inputFilter'] && this.inputFilter && this.inputFilter !== this.outputFilter) {
      this.outputFilter = { ...this.inputFilter };
      this.setSelectionsFromQuery();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setSelectionsFromQuery() {
    if (this.utcOffset === undefined || !this.outputFilter) return;

    this.stationIds = this.outputFilter.stationIds;
    if (this.outputFilter.elementIds) this.elementIds = this.outputFilter.elementIds;
    if (this.outputFilter.level) this.level = this.outputFilter.level;
    if (this.outputFilter.interval) this.interval = this.outputFilter.interval;
    this.durationType = this.outputFilter.durationType;

    if (this.outputFilter.excludeConfirmedMissing !== undefined) this.excludeMissingValues = this.outputFilter.excludeConfirmedMissing;

    const fromDate = DateUtils.getDatetimesBasedOnUTCOffset(this.outputFilter.fromDate, this.utcOffset, 'add').split('T')[0];
    const toDate = DateUtils.getDatetimesBasedOnUTCOffset(this.outputFilter.toDate, this.utcOffset, 'add').split('T')[0];
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
        this.durationYears = [Number(fromYear), Number(toDate[0])];
        break;
      default:
        throw new Error('Developer error. Duration type not supported');
    }

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

  protected onQueryClick(): void {
    if (this.stationIds.length === 0) {
      this.pagesDataService.showToast({ title: 'Data Availability', message: 'Station selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

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
    fromDate = DateUtils.getDatetimesBasedOnUTCOffset(`${fromDate}T00:00:00Z`, this.utcOffset, 'subtract');
    toDate = DateUtils.getDatetimesBasedOnUTCOffset(`${toDate}T23:59:00Z`, this.utcOffset, 'subtract');

    // Set the new output filter
    this.outputFilter = {
      stationIds: this.stationIds,
      durationType: this.durationType,
      fromDate: fromDate,
      toDate: toDate,
      excludeConfirmedMissing: this.excludeMissingValues,
    };

    if (this.elementIds.length > 0) this.outputFilter.elementIds = this.elementIds;
    if (this.level !== null) this.outputFilter.level = this.level;
    if (this.interval !== null) this.outputFilter.interval = this.interval;

    this.queryClick.emit(this.outputFilter);
  }


}
