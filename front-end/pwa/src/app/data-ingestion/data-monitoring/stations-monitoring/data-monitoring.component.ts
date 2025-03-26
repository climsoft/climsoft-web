import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { ObservationsService } from '../../services/observations.service';
import { Subject, take, takeUntil } from 'rxjs';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { StationStatusEnum } from 'src/app/metadata/stations/models/station-status.enum';
import * as L from 'leaflet';
import { StationDataMonitoringComponent } from './station-data-monitoring/station-data-monitoring.component';
import { AppAuthService } from 'src/app/app-auth.service';

interface StationView extends StationCacheModel {
  reporting: boolean;
}

@Component({
  selector: 'app-stations-monitoring',
  templateUrl: './data-monitoring.component.html',
  styleUrls: ['./data-monitoring.component.scss']
})
export class StationsActivityComponent implements OnChanges, OnDestroy {
  @ViewChild('appStationActivity') appStationDataMonitoring!: StationDataMonitoringComponent;
  @Input() searchedStationIds!: string[];
  protected allowedStations: StationView[] = [];
  protected  stationsToRender!: StationView[];
  protected numOfStationsReporting: number=0;
  protected numOfStationsNotReporting: number=0;
  
  protected stationMapLayerGroup!: L.LayerGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private stationsCacheService: StationsCacheService,
    private observationsService: ObservationsService,) {

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(stations => {
      this.filterOutPermittedStationsStations(stations)
    });
  }

  private filterOutPermittedStationsStations(stations: StationCacheModel[]): void {

    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (!user.isSystemAdmin) {
        if (!user.permissions) {
          throw new Error('Developer error. Permissions NOT set.');
        }

        // Set stations permitted
        if (user.permissions.ingestionMonitoringPermissions) {
          if (user.permissions.ingestionMonitoringPermissions.stationIds) {
            const stationIds: string[] = user.permissions.ingestionMonitoringPermissions.stationIds;
            stations = stations.filter(station => stationIds.includes(station.id));
          }
        } else {
          throw new Error('Data entry not allowed');
        }
      }

      this.allowedStations = stations.filter(station => station.status === StationStatusEnum.OPERATIONAL).map(station => {
        return { ...station, reporting: false }
      });
      this.filterOutSearchIds();

    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchedStationIds'] && this.searchedStationIds) {
      // let stations : StationCacheModel[];
      // if(this.searchedStationIds.length>0){
      //   stations  = this.stations.filter(item => this.searchedStationIds.includes(item.id));
      // }else{
      //   stations = this.stations;
      // }
      this.filterOutSearchIds();
    }

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private filterOutSearchIds() {
  
    if (this.searchedStationIds && this.searchedStationIds.length) {
      this.stationsToRender = this.allowedStations.filter(item => this.searchedStationIds.includes(item.id));
    } else {
      this.stationsToRender = this.allowedStations;
    }

    this.observationsService.findStationsThatHaveLast24HoursRecords().pipe(
      take(1),
    ).subscribe(data => {
      for (const station of this.stationsToRender) {
        station.reporting = data.includes(station.id);
      }
      this.numOfStationsReporting = this.stationsToRender.filter(item => item.reporting).length;
      this.numOfStationsNotReporting = this.stationsToRender.filter(item => !item.reporting).length;
   
      this.setupMap(this.stationsToRender);
    });

  }

  private setupMap(stationsToRender: StationView[]): void {
    this.stationMapLayerGroup = L.layerGroup();
    const featureCollection: any = {
      "type": "FeatureCollection",
      "features": stationsToRender.filter(station => (station.location !== null)).map(station => {
        return {
          "type": "Feature",
          "properties": {
            "id": station.id,
            "name": station.name,
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
    let colorValue = station.reporting ? '#3bd424' : '#F73E25';

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
    marker.bindPopup(feature.properties.name);

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
      this.appStationDataMonitoring.showDialog(station);
    });

    return marker;
  }

 
   

}
