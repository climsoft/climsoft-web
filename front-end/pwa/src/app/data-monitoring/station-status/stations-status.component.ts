import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { StationStatusEnum } from 'src/app/metadata/stations/models/station-status.enum';
import * as L from 'leaflet';
import { StationDataComponent } from './station-status-data/station-status-data.component';
import { AppAuthService } from 'src/app/app-auth.service';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationStatusQueryModel } from './models/station-status-query.model';

interface StationView extends StationCacheModel {
  reporting: boolean;
}

@Component({
  selector: 'app-station-status',
  templateUrl: './station-status.component.html',
  styleUrls: ['./station-status.component.scss']
})
export class stationStatusComponent implements OnDestroy {
  @ViewChild('appStationDataActivity')
  appStationDataMonitoring!: StationDataComponent;

  protected stationsPermitted!: StationView[];
  protected numOfStationsReporting: number = 0;
  protected numOfStationsNotReporting: number = 0;

  protected stationMapLayerGroup!: L.LayerGroup;

  protected enableQueryButton: boolean = true;
  private stationStatusFilter: StationStatusQueryModel = { duration: 3, durationType: 'hours' };

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private stationsCacheService: StationsCacheService,
    private observationsService: ObservationsService,) {
    this.pagesDataService.setPageHeader('Stations Status');

    // Get all stations
    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allStations => {
      // filter out permitted stations
      this.filterOutPermittedStationsAndLoadMap(allStations);

    });
  }

  private filterOutPermittedStationsAndLoadMap(stations: StationCacheModel[]): void {
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
      this.stationsPermitted = [];
      for (const station of stations) {
        if (station.status === StationStatusEnum.OPERATIONAL && station.location) {
          this.stationsPermitted.push({ ...station, reporting: false });
        }
      }

      // Load the map stations
      this.loadMapStatus();
    });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onQueryClick(stationStatusFilter: StationStatusQueryModel) {
    this.stationStatusFilter = stationStatusFilter;
    this.loadMapStatus()
  }

  private loadMapStatus() {
    this.observationsService.findStationsObservationStatus(this.stationStatusFilter).pipe(
      take(1),
    ).subscribe({
      next: data => {
        const filteredStations = this.stationStatusFilter.stationIds;
        const stationsToRender: StationView[] = filteredStations ?
          this.stationsPermitted.filter(item => filteredStations.includes(item.id)) : this.stationsPermitted;
        for (const station of stationsToRender) {
          station.reporting = data.includes(station.id);
        }
        this.setupMap(stationsToRender);
        this.pagesDataService.showToast({ title: 'Station Status', message: 'Reporting Status Updated', type: ToastEventTypeEnum.SUCCESS })
      },
      error: err => {
        this.pagesDataService.showToast({ title: 'Station Status', message: err, type: ToastEventTypeEnum.ERROR })
      }
    });

  }

  private setupMap(stationsToRender: StationView[]): void {
    // Set map status numbers
    this.numOfStationsReporting = stationsToRender.filter(item => item.reporting).length;
    this.numOfStationsNotReporting = stationsToRender.filter(item => !item.reporting).length;

    // create stations map layer
    this.stationMapLayerGroup = L.layerGroup();
    const featureCollection: any = {
      "type": "FeatureCollection",
      "features": stationsToRender.map(station => {
        return {
          "type": "Feature",
          "properties": {
            "station": station
          },
          "geometry": {
            "type": "Point",
            "coordinates": [station.location?.longitude, station.location?.latitude]
          }
        };
      })
    };

    L.geoJSON(
      featureCollection,
      { pointToLayer: this.stationMarkers }
    ).addTo(this.stationMapLayerGroup);

  }

  private stationMarkers = (feature: any, latlng: any) => {
    // Get station data and component from feature properties 
    const station: StationView = feature.properties.station;

    // Determine reporting class
    const colorValue = station.reporting ? '#3bd424' : '#F73E25';

    //console.log("latlong", latlng, feature);
    const marker = L.circleMarker(latlng, {
      radius: 7,
      fillColor: colorValue,
      color: '#ffffff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });

    // For demonstration, bind station name to popup
    marker.bindPopup(`${station.id} - ${station.name}`);

    // Show the popup on mouseover
    marker.on('mouseover', () => {
      marker.openPopup();
    });

    // Hide the popup on mouseout
    marker.on('mouseout', () => {
      marker.closePopup();
    });

    // marker.bindPopup(`${feature.properties.name}`);
    marker.on('click', () => {
      this.appStationDataMonitoring.showDialog(
        station,
        {
          duration: this.stationStatusFilter.duration,
          durationType: this.stationStatusFilter.durationType,
          elementId: this.stationStatusFilter.elementId
        }
      );
    });

    return marker;
  }

}
