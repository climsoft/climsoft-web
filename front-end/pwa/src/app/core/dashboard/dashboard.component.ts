import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService } from '../services/pages-data.service';
import { GeneralSettingsService } from '../../settings/general-settings/services/general-settings.service';
import { ClimsoftBoundaryModel } from '../../settings/general-settings/models/settings/climsoft-boundary.model';
import {  StationCacheModel, StationsCacheService } from '../../metadata/stations/services/stations-cache.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnDestroy {

  private dashboardMap: any;

    protected stations!: StationCacheModel[];

   private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsService: GeneralSettingsService,
    private stationsCacheService: StationsCacheService,) {
    this.pagesDataService.setPageHeader('Dashboard');

      this.stationsCacheService.cachedStations.pipe(
          takeUntil(this.destroy$),
        ).subscribe(stations => {
          this.stations = stations; 
        });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
