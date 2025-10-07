import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import * as echarts from 'echarts';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { DataAvailabilitySummaryQueryModel, DurationTypeEnum } from './models/data-availability-summary-query.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ActivatedRoute } from '@angular/router';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataSearchService } from 'src/app/metadata/metadata-updates/cached-metadata-search.service';
import { DataAvailabilityOptionsDialogComponent } from './data-availability-options-dialog/data-availability-options-dialog.component';
import { DataAvailabilitySummaryComponent } from './data-availability-summary/data-availability-summary.component';
import { DataAvailabilityDetailsComponent } from './data-availability-details/data-availability-details.component';

type tab = 'summary' | 'details';

@Component({
  selector: 'app-data-availability',
  templateUrl: './data-availability.component.html',
  styleUrls: ['./data-availability.component.scss']
})
export class DataAvailabilityComponent implements OnInit, OnDestroy {
  @ViewChild('appDataAvailabilitySummary') appDataSummary!: DataAvailabilitySummaryComponent;
  @ViewChild('appDataAvailabilityDetails') appDataDetails!: DataAvailabilityDetailsComponent;

  protected activeTab: tab = 'summary';
  protected enableQueryButton: boolean = true;
  protected filter!: DataAvailabilitySummaryQueryModel;
  protected utcOffset!: number;
  protected allStations!: StationCacheModel[];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataSearchService: CachedMetadataSearchService,
    private route: ActivatedRoute,
  ) {
    this.pagesDataService.setPageHeader('Data Availability');
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.keys.length > 0) {
        const stationIds: string[] = params.getAll('stationIds');
        const elementIds: string[] = params.getAll('elementIds');
        const interval: string | null = params.get('interval');
        const level: string | null = params.get('level');
        const excludeConfirmedMissing: string | null = params.get('excludeConfirmedMissing');
        const durationType: string | null = params.get('durationType');
        const fromDate: string | null = params.get('fromDate');
        const toDate: string | null = params.get('toDate');
        if (durationType === null) {
          throw new Error('duration type must be selected');
        }

        if (fromDate === null) {
          throw new Error('from datee must be selected');
        }

        if (toDate === null) {
          throw new Error('from datee must be selected');
        }

        const newFilter: DataAvailabilitySummaryQueryModel = {
          durationType: DurationTypeEnum[durationType.toUpperCase() as keyof typeof DurationTypeEnum],
          fromDate: fromDate,
          toDate: toDate,
        };

        if (stationIds.length > 0) newFilter.stationIds = stationIds;
        if (elementIds.length > 0) newFilter.elementIds = elementIds.map(Number);
        if (interval) newFilter.interval = Number(interval);
        if (level !== null) newFilter.level = Number(level);
        if (excludeConfirmedMissing !== null) {
          newFilter.excludeConfirmedMissing = excludeConfirmedMissing.toString().toLowerCase() === 'true' ? true : false;
        }

        this.filter = newFilter;
      }

      // Get the climsoft time zone display setting
      this.cachedMetadataSearchService.allMetadataLoaded.pipe(
        takeUntil(this.destroy$),
      ).subscribe((allMetadataLoaded) => {
        if (!allMetadataLoaded) return;
        this.utcOffset = this.cachedMetadataSearchService.getUTCOffSet();
        this.allStations = this.cachedMetadataSearchService.stationsMetadata;

        // If there is a filter then load data
        if (this.filter) this.loadDataAvailability();

      });

    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onTabClick(selectedTab: tab): void {
    this.activeTab = selectedTab;
    this.loadDataAvailability();
  }

  protected onQueryClick(newDataAvailabilityFilter: DataAvailabilitySummaryQueryModel): void {
    this.filter = newDataAvailabilityFilter;
    this.loadDataAvailability();
  }

  private loadDataAvailability(): void {
    switch (this.activeTab) {
      case 'summary':
        this.appDataSummary.loadSummary(this.filter, this.utcOffset);
        break;
      case 'details':
        this.appDataDetails.loadDetails(this.filter);
        break;
      default:
        throw new Error('Developer error: tab type not supported.')
    }
  }





}
