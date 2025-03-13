import { Component, OnDestroy } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { Subject, take, takeUntil } from 'rxjs';
import { DuplicateModel, SourceCheckService } from '../../services/source-check.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { Interval, IntervalsUtil } from 'src/app/shared/controls/period-input/period-single-input/Intervals.util';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';


@Component({
  selector: 'app-source-check',
  templateUrl: './source-check.component.html',
  styleUrls: ['./source-check.component.scss']
})
export class SourceCheckComponent implements OnDestroy {

  protected totalRecords: number = 0;

  protected stationId: string | null = null;
  protected sourceId: number | null = null;
  protected elementId: number | null = null;
  protected interval: number | null = null;
  protected elevation: number | null = null;
  protected fromDate: string | null = null;
  protected toDate: string | null = null;
  protected hour: number | null = null;
  protected useEntryDate: boolean = false;
  protected observationsEntries: DuplicateModel[] = [];
  protected stationsMetdata: StationCacheModel[] = [];
  private elementsMetadata: ElementCacheModel[] = [];
  private periods: Interval[] = IntervalsUtil.possibleIntervals;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  private observationFilter!: ViewObservationQueryModel;
  protected enableView: boolean = true;
  protected sumOfDuplicates: number = 0;
  protected includeOnlyStationIds: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private stationsService: StationsCacheService,
    private elementService: ElementsCacheService,
    private sourceCheckService: SourceCheckService,
  ) {

    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (user.isSystemAdmin) {
        this.includeOnlyStationIds = [];
      } else if (user.permissions && user.permissions.qcPermissions) {
        if (user.permissions.qcPermissions.stationIds) {
          this.includeOnlyStationIds = user.permissions.qcPermissions.stationIds;
        } else {
          this.includeOnlyStationIds = [];
        }
      } else {
        throw new Error('QC not allowed');
      }
    });

    this.stationsService.cachedStations.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.stationsMetdata = data;
    });

    this.elementService.cachedElements.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.elementsMetadata = data;
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loadData(): void {
    this.sumOfDuplicates = 0;
    this.observationsEntries = [];
    this.observationFilter.page = this.pageInputDefinition.page;
    this.observationFilter.pageSize = this.pageInputDefinition.pageSize;
    this.sourceCheckService.find(this.observationFilter).pipe(take(1)).subscribe(data => {
      this.observationsEntries = data;
    });
  }

  protected onDateToUseSelection(selection: string): void {
    this.useEntryDate = selection === 'Entry Date';
  }

  protected getStationName(duplicate: DuplicateModel): string {
    const name = this.stationsMetdata.find(item => (item.id === duplicate.stationId))?.name;
    return name ? name : '';
  }

  protected getElementAbbrv(duplicate: DuplicateModel): string {
    const name = this.elementsMetadata.find(item => (item.id === duplicate.elementId))?.abbreviation;
    return name ? name : '';
  }

  protected getFormattedDatetime(strDateTime: string): string {
    return strDateTime.replace('T', ' ').replace('Z', '');
  }

  protected getPeriodName(minutes: number): string {
    const periodFound = this.periods.find(item => item.id === minutes);
    return periodFound ? periodFound.name : minutes + 'mins';
  }

  protected onViewClick(): void {
    // Get the data based on the selection filter
    this.observationFilter = { deleted: false };

    if (this.stationId !== null) {
      this.observationFilter.stationIds = [this.stationId];
    }

    if (this.elementId !== null) {
      this.observationFilter.elementIds = [this.elementId];
    }

    if (this.interval !== null) {
      this.observationFilter.interval = this.interval;
    }

    if (this.elevation !== null) {
      this.observationFilter.level = this.elevation;
    }

    if (this.sourceId !== null) {
      this.observationFilter.sourceIds = [this.sourceId];
    }

    // TODO. Investigate. If this is set to false, the dto is sets it true for some reasons
    // So only setting to true (making it to defined) when its to be set to true.
    // When this.useEntryDate is false then don't define it, to avoid the bug defined above.
    if (this.useEntryDate) {
      this.observationFilter.useEntryDate = true;
    }

    if (this.fromDate !== null) {
      this.observationFilter.fromDate = `${this.fromDate}T00:00:00Z`;
    }

    if (this.toDate !== null) {
      this.observationFilter.toDate = `${this.toDate}T23:00:00Z`;
    }

    this.observationsEntries = [];
    this.pageInputDefinition.setTotalRowCount(0)
    this.enableView = false;
    this.sourceCheckService.count(this.observationFilter).pipe(take(1)).subscribe(count => {
      this.enableView = true;
      this.pageInputDefinition.setTotalRowCount(count);
      if (count > 0) {
        this.loadData();
        this.sourceCheckService.sum(this.observationFilter).pipe(take(1)).subscribe(sum => {
          this.sumOfDuplicates = sum;
        });

      }
    });

  }


}
