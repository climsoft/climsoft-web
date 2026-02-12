import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/permissions/user-permission.model';
import { DataCorrectionComponent } from '../../data-ingestion/data-correction/data-correction.component';
import { SourceChecksComponent } from '../../quality-control/source-checks/source-checks.component';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { DataExplorerComponent } from 'src/app/data-monitoring/data-explorer/data-explorer.component';
import { QueryQCDataChecksComponent } from 'src/app/quality-control/qc-data-checks/query-qc-data-checks/query-qc-data-checks.component';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-query-selection',
  templateUrl: './query-selection.component.html',
  styleUrls: ['./query-selection.component.scss']
})
export class QuerySelectionComponent implements OnChanges, OnDestroy {
  @Input() public parentComponentName!: string;
  @Input() public enableQueryButton: boolean = true;
  @Input() public displayStationSelector: boolean = true;
  @Input() public displayElementSelector: boolean = true;
  @Input() public displaySourceSelector: boolean = true;
  @Input() public displayLevelSelector: boolean = true;
  @Input() public displayIntervalSelector: boolean = true;
  @Input() public displayObservationDateSelector: boolean = true;
  @Input() public displayEntryDateSelector: boolean = true;
  @Input() public displayFilterHeader: boolean = true;
  @Input() public inputFilter!: ViewObservationQueryModel;
  @Output() public queryClick = new EventEmitter<ViewObservationQueryModel>();
  @Output() public queryAllowedChange = new EventEmitter<boolean>();

  protected stationIds: string[] = [];
  protected sourceIds: number[] = [];
  protected elementIds: number[] = [];
  protected intervals: number[] = [];
  protected level: number | null | undefined = 0;
  protected dateRange: DateRange;
  protected useEntryDate: boolean = false;
  protected queryAllowed: boolean = true;
  protected includeOnlyStationIds: string[] = [];
  private utcOffset!: number;

  protected displayFilterControls: boolean = true;

  private outputFilter!: ViewObservationQueryModel;

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private cachedMetadataSearchService: CachedMetadataService,
  ) {

    // Set default dates to yesterday
    const toDate: Date = new Date();
    const fromDate: Date = new Date();
    fromDate.setDate(toDate.getDate() - 1);
    this.dateRange = { fromDate: DateUtils.getDateOnlyAsString(fromDate), toDate: DateUtils.getDateOnlyAsString(toDate) };

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.utcOffset = this.cachedMetadataSearchService.utcOffSet;
      this.setSelectionsFromOutputFilter();
    });


  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['parentComponentName'] && this.parentComponentName) {
      this.setStationsAllowed();
    }

    if (changes['inputFilter'] && this.inputFilter && this.inputFilter !== this.outputFilter) {
      this.outputFilter = { ...this.inputFilter };
      this.setSelectionsFromOutputFilter();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setSelectionsFromOutputFilter() {
    if (this.utcOffset === undefined || !this.outputFilter) return;

    if (this.outputFilter.stationIds) this.stationIds = this.outputFilter.stationIds;
    if (this.outputFilter.elementIds) this.elementIds = this.outputFilter.elementIds;
    if (this.outputFilter.level) this.level = this.outputFilter.level;
    if (this.outputFilter.intervals) this.intervals = this.outputFilter.intervals;
    if (this.outputFilter.sourceIds) this.sourceIds = this.outputFilter.sourceIds;
    if (this.outputFilter.useEntryDate !== undefined) this.useEntryDate = this.outputFilter.useEntryDate;
    if (this.outputFilter.fromDate) this.dateRange.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(this.outputFilter.fromDate, this.utcOffset, 'add').split('T')[0];
    if (this.outputFilter.toDate) this.dateRange.toDate = DateUtils.getDatetimesBasedOnUTCOffset(this.outputFilter.toDate, this.utcOffset, 'add').split('T')[0];
  }

  private setStationsAllowed(): void {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        this.queryAllowed = false;
        this.queryAllowedChange.emit(this.queryAllowed);
        return;
      }

      this.queryAllowed = true;
      if (user.isSystemAdmin) {
        this.includeOnlyStationIds = [];
        return;
      }

      if (!user.permissions) {
        this.queryAllowed = false;
        this.queryAllowedChange.emit(this.queryAllowed);
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
        case SourceChecksComponent.name:
        case QueryQCDataChecksComponent.name:
          if (permissions.qcPermissions) {
            this.includeOnlyStationIds = permissions.qcPermissions.stationIds ? permissions.qcPermissions.stationIds : [];
          } else {
            this.queryAllowed = false;
          }
          break;
        default:
          this.queryAllowed = false;
          console.error('Developer error. Component name not supported in query selection.');
          break;
      }

      this.queryAllowedChange.emit(this.queryAllowed);

    });
  }

  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  protected onQueryClick(): void {
    // Always reset the filter
    this.outputFilter = this.outputFilter ? { deleted: this.outputFilter.deleted } : { deleted: false };

    // Get the data based on the selection filter 
    if (this.stationIds.length > 0) this.outputFilter.stationIds = this.stationIds;
    if (this.elementIds.length > 0) this.outputFilter.elementIds = this.elementIds;
    if (this.elementIds.length > 0) this.outputFilter.elementIds = this.elementIds;
    if (this.intervals.length > 0) this.outputFilter.intervals = this.intervals;
    if (this.level !== null) this.outputFilter.level = this.level;
    if (this.sourceIds.length > 0) this.outputFilter.sourceIds = this.sourceIds;
    if (this.useEntryDate) this.outputFilter.useEntryDate = this.useEntryDate;

    // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
    // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
    this.outputFilter.fromDate = this.dateRange.fromDate ? DateUtils.getDatetimesBasedOnUTCOffset(
      `${this.dateRange.fromDate}T00:00:00.000Z`, this.utcOffset, 'subtract') : undefined;
    this.outputFilter.toDate = this.dateRange.toDate ? DateUtils.getDatetimesBasedOnUTCOffset(
      `${this.dateRange.toDate}T23:59:00.000Z`, this.utcOffset, 'subtract') : undefined;

    // Emit the new filter parameters
    this.queryClick.emit(this.outputFilter);
  }

  // TODO.
  // Temporary made public because of QC assessment. 
  // After refactoring this componenent, ot can be changed back to protected.
  public getFilter(): ViewObservationQueryModel {
    const outputFilter: ViewObservationQueryModel = { deleted: false };
    // Get the data based on the selection filter 
    if (this.stationIds.length > 0) outputFilter.stationIds = this.stationIds;
    if (this.elementIds.length > 0) outputFilter.elementIds = this.elementIds;
    if (this.elementIds.length > 0) outputFilter.elementIds = this.elementIds;
    if (this.intervals.length > 0) outputFilter.intervals = this.intervals;
    if (this.level !== null) outputFilter.level = this.level;
    if (this.sourceIds.length > 0) outputFilter.sourceIds = this.sourceIds;
    if (this.useEntryDate) outputFilter.useEntryDate = this.useEntryDate;

    // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
    // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
    outputFilter.fromDate = this.dateRange.fromDate ? DateUtils.getDatetimesBasedOnUTCOffset(
      `${this.dateRange.fromDate}T00:00:00.000Z`, this.utcOffset, 'subtract') : undefined;
    outputFilter.toDate = this.dateRange.toDate ? DateUtils.getDatetimesBasedOnUTCOffset(
      `${this.dateRange.toDate}T23:59:00.000Z`, this.utcOffset, 'subtract') : undefined;

    return outputFilter;
  }



}
