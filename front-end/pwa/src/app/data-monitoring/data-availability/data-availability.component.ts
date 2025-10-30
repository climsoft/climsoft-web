import { Component, OnDestroy, OnInit } from '@angular/core';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { Subject, takeUntil } from 'rxjs';
import { DataAvailabilitySummaryQueryModel } from './models/data-availability-summary-query.model';
import { ActivatedRoute } from '@angular/router';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DataAvailabilityDetailsQueryModel } from './models/data-availability-details-query.model';
import { DurationTypeEnum } from './models/duration-type.enum';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { AppAuthService } from 'src/app/app-auth.service';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { DataAvailabilityFilterModel } from './data-availability-filter-selection-general/data-availability-filter-selection-general.component';

// TODO. This component needs more refactoring.

@Component({
  selector: 'app-data-availability',
  templateUrl: './data-availability.component.html',
  styleUrls: ['./data-availability.component.scss']
})
export class DataAvailabilityComponent implements OnInit, OnDestroy {
  protected stationsPermitted!: StationCacheModel[];
  protected activeTab: 'summary' | 'details' = 'summary';
  protected summaryFilter!: DataAvailabilitySummaryQueryModel;
  protected detailsFilter!: DataAvailabilityFilterModel;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataService: CachedMetadataService,
    private route: ActivatedRoute,
    private appAuthService: AppAuthService,
  ) {
    this.pagesDataService.setPageHeader('Data Availability');

    this.cachedMetadataService.allMetadataLoaded.subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.filterOutPermittedStations(this.cachedMetadataService.stationsMetadata)
    });
  }

  ngOnInit(): void {
    let newFilter: DataAvailabilitySummaryQueryModel | null = null;
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

        newFilter = {
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
      }

      //Check if all metadathas been loaded and if there is a filter then load data availability
      this.cachedMetadataService.allMetadataLoaded.pipe(
        takeUntil(this.destroy$),
      ).subscribe((allMetadataLoaded) => {
        if (!allMetadataLoaded) return;
        if (newFilter) {
          this.summaryFilter = newFilter;
          this.detailsFilter = newFilter;
        }
      });

    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private filterOutPermittedStations(stations: StationCacheModel[]): void {
    // Get user
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      // If user is not admin then filter out the stations
      if (!user.isSystemAdmin) {
        if (!user.permissions) {
          throw new Error('Developer error. Permissions NOT set.');
        }

        // Filter out stations permitted
        if (user.permissions.ingestionMonitoringPermissions) {
          const stationIds: string[] | undefined = user.permissions.ingestionMonitoringPermissions.stationIds;
          // If stations have been defined then set them
          if (stationIds) {
            stations = stations.filter(station => stationIds.includes(station.id));
          }
        } else {
          throw new Error('Data monitoring not allowed');
        }
      }

      // Get stations that are operational and have locations only
      this.stationsPermitted = stations;

    });
  }

  protected onTabClick(selectedTab: 'summary' | 'details'): void {
    this.activeTab = selectedTab;
    const fromDate = DateUtils.getDatetimesBasedOnUTCOffset(new Date().toISOString(), this.cachedMetadataService.utcOffSet, 'subtract');

    // If summary filter is not defined. Just define it
    if (!this.summaryFilter) {
      this.summaryFilter = {
        durationType: DurationTypeEnum.DAY,
        fromDate: fromDate,
        toDate: fromDate,
      }
    }

    // If details filter is not defined. Just define it
    if (!this.detailsFilter) {
      this.detailsFilter = { ...this.summaryFilter };
    }

    // When choosing tabs. Change the filters of those tabs with contents of the previous tab.
    if (this.activeTab === 'summary') {

      this.summaryFilter = {
        ...this.detailsFilter,
        fromDate: this.summaryFilter.fromDate, // Important. Don't use details from date as it changes the starting hour
        durationType: this.summaryFilter.durationType,
        excludeConfirmedMissing: this.summaryFilter.excludeConfirmedMissing,
      }



    } else if (this.activeTab === 'details') {
      this.detailsFilter = {
        ...this.summaryFilter,
        fromDate: this.detailsFilter.fromDate,// Important. Do't use summary from date
      }

    }

    //console.log('summaryFilter: ', this.summaryFilter);
    //console.log('detailsFilter: ', this.detailsFilter);

  }

}

