import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { DataAvailabilitySummaryQueryModel } from '../models/data-availability-summary-query.model';
import { DataAvailabilityHeatmapComponent, DataAvailabilityCellClickEvent } from './data-availability-heatmap/data-availability-heatmap.component';
import { DataAvailabilityDetailsDialogComponent } from './data-availability-details-dialog/data-availability-details-dialog.component';
import { DataAvailabilityFilterModel, DataAvailabilityFilterSelectionGeneralComponent } from '../data-availability-filter-selection-general/data-availability-filter-selection-general.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DurationTypeEnum } from '../models/duration-type.enum';
import { AppAuthService } from 'src/app/app-auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-data-availability-summary',
  templateUrl: './data-availability-summary.component.html',
  styleUrls: ['./data-availability-summary.component.scss']
})
export class DataAvailabilitySummaryComponent {
  @ViewChild('appDAFilterGSummarySelection') private daGeneralFilterComponent!: DataAvailabilityFilterSelectionGeneralComponent;
  @ViewChild('heatmap') private heatmap!: DataAvailabilityHeatmapComponent;
  @ViewChild('detailsDialog') private detailsDialog!: DataAvailabilityDetailsDialogComponent;

  @Input() public stationsPermitted!: StationCacheModel[];

  protected generalFilter!: DataAvailabilityFilterModel;
  protected excludeMissingValues: boolean = false;
  protected enableQueryButton = true;

  private destroy$ = new Subject<void>();

  constructor(
    private cachedMetadataService: CachedMetadataService,
    private appAuthService: AppAuthService,) {

    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      const fromDate = DateUtils.getDatetimesBasedOnUTCOffset(new Date().toISOString(), this.cachedMetadataService.utcOffSet, 'subtract');
      this.generalFilter = {
        durationType: DurationTypeEnum.DAY,
        fromDate: fromDate,
        toDate: fromDate,
      }
      this.filterOutPermittedStations(this.cachedMetadataService.stationsMetadata)
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

  protected onQueryClick(): void {
    // Set the new output filter
    const generalFilter = this.daGeneralFilterComponent.getFilterFromSelections();
    if (generalFilter) {
      const filter: DataAvailabilitySummaryQueryModel = { ...generalFilter };
      if (this.excludeMissingValues) filter.excludeConfirmedMissing = this.excludeMissingValues;
      this.heatmap.executeQuery(filter, this.stationsPermitted);
    }
  }

  protected onLoadingChange(loading: boolean): void {
    this.enableQueryButton = !loading;
  }

  protected onCellClick(event: DataAvailabilityCellClickEvent): void {
    this.detailsDialog.openDialog(event.derivedFilter, this.stationsPermitted, event.hideDrillDown);
  }
}
