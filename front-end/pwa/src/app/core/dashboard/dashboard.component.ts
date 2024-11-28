import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { take } from 'rxjs';
import { PagesDataService } from '../services/pages-data.service';
import { StationsService } from '../services/stations/stations.service';
import { RegionsService } from '../services/regions/regions.service';
import { GeneralSettingsService } from '../services/settings/general-settings.service';
import { SettingIds } from '../models/settings/setting-ids';
import { Settings1ParamsModel } from '../models/settings/settings-params/settings-1-params.model';
import {  StationsCacheService } from '../../metadata/stations/services/stations-cache.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements AfterViewInit {

  private dashboardMap: any;

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsService: GeneralSettingsService,
    private stationsCacheService: StationsCacheService,
    private regionsService: RegionsService) {
    this.pagesDataService.setPageHeader('Dashboard');
  }

  ngAfterViewInit(): void {
    this.generalSettingsService.findOne(SettingIds.DEFAULT_MAP_VIEW).subscribe((data) => {
      if (data && data.parameters) {
        this.initMap(data.parameters as Settings1ParamsModel);
        this.addStationsToMap();
        //this.addregionsToMap();
      }

    });
  }

  private initMap(defaultMapView: Settings1ParamsModel): void {
    this.dashboardMap = L.map('map').setView(
      [defaultMapView.latitude, 
        defaultMapView.longitude
      ],
      defaultMapView.zoomLevel); // Set initial coordinates and zoom level
    this.dashboardMap.attributionControl.setPrefix('');

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.dashboardMap);

  }

  private addStationsToMap(): void {
    // Get all the stations and add them to leaflet as a layer.
    this.stationsCacheService.cachedStations.subscribe((data) => {
      const featureCollection: any = {
        "type": "FeatureCollection",
        "features": data.map(item => {
          return {
            "type": "Feature",
            "properties": {
              "id": item.id,
              "name": item.name,    // TODO. other properties
            },
            "geometry": {
              "type": "Point",
              "coordinates": [item.location?.longitude, item.location?.latitude]
            }
          };
        })
      };

      const stationLayer = L.geoJSON(featureCollection, { pointToLayer: this.stationMarkers }).addTo(this.dashboardMap);
      stationLayer.bringToFront();
    });
  }

  private stationMarkers(feature: any, latlng: any) {
    //console.log("latlong", latlng, feature);
    const marker = L.circleMarker(latlng, {
      radius: 5,
      fillColor: '#1330BF',
      color: '#1330BF',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });

    marker.bindPopup(`${feature.properties.name}`);
    return marker;

  }

  // TODO. Use later
  private addregionsToMap(): void {
    this.regionsService.findAll().pipe(take(1)).subscribe((data) => {
      const regionsFeatureCollection: any = {
        "type": "FeatureCollection",
        "features": data.map(item => {
          return {
            "type": "Feature",
            "properties": {
              "name": item.name,    // TODO. 
            },
            "geometry": {
              "type": "MultiPolygon",
              "coordinates": item.boundary
            }
          };
        })
      };

      L.geoJSON(regionsFeatureCollection, {
        style: { fillColor: 'transparent', color: 'blue', weight: 0.5 }, // "opacity": 0.5 
        onEachFeature: this.onEachRegionFeature,
        //interactive: false
      }).addTo(this.dashboardMap);

    });
  }

  private onEachRegionFeature(feature: any, layer: any) {
    layer.bindPopup(`<p>Administrative Region: ${feature.properties.name} </p>`);
  }



}
