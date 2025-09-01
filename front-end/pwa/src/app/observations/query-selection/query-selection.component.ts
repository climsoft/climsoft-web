import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { Subject, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { UserPermissionModel } from 'src/app/admin/users/models/user-permission.model';
import { DataCorrectionComponent } from '../../data-ingestion/data-correction/data-correction.component';
import { SourceChecksComponent } from '../../quality-control/source-checks/source-checks.component';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { DataExplorerComponent } from 'src/app/data-monitoring/data-explorer/data-explorer.component';
import { QueryQCDataChecksComponent } from 'src/app/quality-control/qc-data-checks/query-qc-data-checks/query-qc-data-checks.component';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';

@Component({
  selector: 'app-query-selection',
  templateUrl: './query-selection.component.html',
  styleUrls: ['./query-selection.component.scss']
})
export class QuerySelectionComponent implements OnChanges, OnDestroy {
  @Input() public parentComponentName!: string;
  @Input() public enableQueryButton: boolean = true;
  @Input() public includeDeletedData: boolean = false;
  @Input() public displayStationSelector: boolean = true;
  @Input() public displayElementSelector: boolean = true;
  @Input() public displaySourceSelector: boolean = true;
  @Input() public displayLevelSelector: boolean = true;
  @Input() public displayIntervalSelector: boolean = true;
  @Input() public displayObservationDateSelector: boolean = true;
  @Input() public displayEntryDateSelector: boolean = true;
  @Input() public displayFilterHeader: boolean = true;
  @Input() public query!: ViewObservationQueryModel;
  @Output() public queryChange = new EventEmitter<ViewObservationQueryModel>();
  @Output() public queryClick = new EventEmitter<ViewObservationQueryModel>();
  @Output() public queryAllowedChange = new EventEmitter<boolean>();

  protected stationIds: string[] = [];
  protected sourceIds: number[] = [];
  protected elementIds: number[] = [];
  protected intervals: number[] = [];
  protected level: number | null = 0;
  protected useEntryDate: boolean = false;
  protected queryAllowed: boolean = true;
  protected includeOnlyStationIds: string[] = [];
  private utcOffset: number = 0;
  protected dateRange: DateRange;
  protected displayFilterControls: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
  ) {

    // Set default dates to yesterday
    const toDate: Date = new Date();
    const fromDate: Date = new Date();
    fromDate.setDate(toDate.getDate() - 1);
    this.dateRange = { fromDate: DateUtils.getDateOnlyAsString(fromDate), toDate: DateUtils.getDateOnlyAsString(toDate) };

    this.cachedMetadataSearchService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if(!allMetadataLoaded) return;
      console.log('allMetadataLoaded: ', allMetadataLoaded)
      this.utcOffset = this.cachedMetadataSearchService.getUTCOffSet();
    });

   
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parentComponentName'] && this.parentComponentName) {
      this.setStationsAllowed();
    }

    if (changes['query'] && this.query) {
      console.log('query changed before: ', this.query);
      console.log('dateRange changed before: ', this.dateRange);

      if (this.query.stationIds) this.stationIds = this.query.stationIds;
      if (this.query.elementIds) this.elementIds = this.query.elementIds;
      if (this.query.level) this.level = this.query.level;
      if (this.query.intervals) this.intervals = this.query.intervals;
      if (this.query.sourceIds) this.sourceIds = this.query.sourceIds;
      if (this.query.useEntryDate) this.useEntryDate = this.query.useEntryDate;
      if (this.query.fromDate) this.dateRange.fromDate = this.query.fromDate.split('T')[0];
      if (this.query.toDate) this.dateRange.toDate = this.query.toDate.split('T')[0];
      if (this.query.deleted) this.includeDeletedData = this.query.deleted;

      console.log('query changed after: ', this.query);
      console.log('dateRange changed after: ', this.dateRange);
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
        this.queryAllowed = false;
        this.queryAllowedChange.emit(this.queryAllowed);
        throw new Error('User not logged in');
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
    this.onValueChanged();
  }

  private setQuery(): void {
     console.log('query: ', this.query);
     if(!this.query) this.query = {deleted: this.includeDeletedData}
    // Get the data based on the selection filter
    this.query.deleted = this.includeDeletedData;
    this.query.stationIds = this.stationIds.length > 0 ? this.stationIds : undefined;
    this.query.elementIds = this.elementIds.length > 0 ? this.elementIds : undefined;
    this.query.intervals = this.intervals.length > 0 ? this.intervals : undefined;
    this.query.level = this.level !== null ? this.level : undefined;
    this.query.sourceIds = this.sourceIds.length > 0 ? this.sourceIds : undefined;

    // TODO. Investigate. If this is set to false, the dto sets it true for some reasons
    // So only setting to true (making it to defined) when its to be set to true.
    // When this.useEntryDate is false then don't define it, to avoid the bug defined above.
    this.query.useEntryDate = this.useEntryDate ? true : undefined;

     // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
      // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
      this.query.fromDate = this.dateRange.fromDate? DateUtils.getDatetimesBasedOnUTCOffset(
        `${this.dateRange.fromDate}T00:00:00Z`, this.utcOffset, 'subtract'): undefined;

    // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
      // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
      this.query.toDate = this.dateRange.toDate? DateUtils.getDatetimesBasedOnUTCOffset(
        `${this.dateRange.toDate}T23:59:00Z`, this.utcOffset, 'subtract'): undefined;
  }

  protected onValueChanged(): void {
    this.setQuery();
    this.queryChange.emit(this.query);
  }

  protected onQueryClick(): void {
    this.setQuery();
    this.queryClick.emit(this.query);
  }





}
