import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';
import { DataCorrectionComponent } from '../data-correction/data-correction.component';
import { SourceCheckComponent } from '../manage-qc-data/source-check/source-check.component';
import { DataExplorerComponent } from '../data-monitoring/data-explorer/data-explorer.component';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';

@Component({
  selector: 'app-query-selection',
  templateUrl: './query-selection.component.html',
  styleUrls: ['./query-selection.component.scss']
})
export class QuerySelectionComponent implements OnChanges, OnDestroy {
  @Input() public parentComponentName!: string;
  @Input() public enableQueryButton: boolean = true;
  @Input() public includeDeletedData: boolean = false;
  @Input() public dateRange: DateRange;
  @Input() public displaySourceSelector: boolean = true;
  @Input() public displayLevelSelector: boolean = true;
  @Input() public displayIntervalSelector: boolean = true;
  @Input() public displayEntryDateSelector: boolean = true;

  @Output() public queryClick = new EventEmitter<ViewObservationQueryModel>()

  protected stationIds: string[] = [];
  protected sourceIds: number[] = [];
  protected elementIds: number[] = [];
  protected intervals: number[] = [];
  protected level: number | null = null;
  protected useEntryDate: boolean = false;
  protected queryAllowed: boolean = true;
  protected includeOnlyStationIds: string[] = [];
  private utcOffset: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private generalSettingsService: GeneralSettingsService,
  ) {

    // Set default dates to 1 year
    const todayDate = new Date();
    const firstDate: Date = new Date();
    firstDate.setDate(todayDate.getDate() - 365);
    this.dateRange = { fromDate: DateUtils.getDateOnlyAsString(firstDate), toDate: DateUtils.getDateOnlyAsString(todayDate) };

    // Get the climsoft time zone display setting
    this.generalSettingsService.findOne(SettingIdEnum.DISPLAY_TIME_ZONE).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.utcOffset = (data.parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parentComponentName'] && this.parentComponentName) {
      this.setStationsAllowed();
    }
  }

  ngOnDestroy() {
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

      switch (this.parentComponentName) {
        case DataCorrectionComponent.name:
          if (permissions.entryPermissions) {
            this.includeOnlyStationIds = permissions.entryPermissions.stationIds ? permissions.entryPermissions.stationIds : [];
          } else {
            this.queryAllowed = false;
          }
          break;
        case DataExplorerComponent.name:
          if (permissions.ingestionMonitoringPermissions) {
            this.includeOnlyStationIds = permissions.ingestionMonitoringPermissions.stationIds ? permissions.ingestionMonitoringPermissions.stationIds : [];
          } else {
            this.queryAllowed = false;
          }
          break;
        case SourceCheckComponent.name:
          if (permissions.qcPermissions) {
            this.includeOnlyStationIds = permissions.qcPermissions.stationIds ? permissions.qcPermissions.stationIds : [];
          } else {
            this.queryAllowed = false;
          }
          break;

        default:
          this.queryAllowed = false;
          throw new Error('Developer error. Component name not supported in query selection.');
      }

    });
  }

  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  protected onQueryClick(): void {
    const observationFilter: ViewObservationQueryModel = { deleted: this.includeDeletedData };;

    // Get the data based on the selection filter

    if (this.stationIds.length > 0) {
      observationFilter.stationIds = this.stationIds;
    }

    if (this.elementIds.length > 0) {
      observationFilter.elementIds = this.elementIds;
    }

    if (this.intervals.length > 0) {
      observationFilter.intervals = this.intervals;
    }

    if (this.level !== null) {
      observationFilter.level = this.level;
    }

    if (this.sourceIds.length > 0) {
      observationFilter.sourceIds = this.sourceIds;
    }

    // TODO. Investigate. If this is set to false, the dto sets it true for some reasons
    // So only setting to true (making it to defined) when its to be set to true.
    // When this.useEntryDate is false then don't define it, to avoid the bug defined above.
    if (this.useEntryDate) {
      observationFilter.useEntryDate = true;
    }

    if (this.dateRange.fromDate) {
      // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
      // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
      observationFilter.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(`${this.dateRange.fromDate}T00:00:00Z`, this.utcOffset, 'subtract');
    }

    if (this.dateRange.toDate) {
      // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
      // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
      observationFilter.toDate = DateUtils.getDatetimesBasedOnUTCOffset(`${this.dateRange.toDate}T23:59:00Z`, this.utcOffset, 'subtract');
    }

    this.queryClick.emit(observationFilter);

  }



}
