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
export class DashboardComponent implements AfterViewInit, OnDestroy {

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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    // this.generalSettingsService.findOne(2).pipe(
    //   take(1)
    // ).subscribe((data) => {
    //   if (data && data.parameters) {
    //     this.initMap(data.parameters as ClimsoftBoundaryModel);
    //     this.addStationsToMap();
    //     //this.addregionsToMap();
    //   }

    // });
  }

  // private initMap(defaultMapView: ClimsoftBoundaryModel): void {
  //   this.dashboardMap = L.map('map').setView(
  //     [defaultMapView.latitude, 
  //       defaultMapView.longitude
  //     ],
  //     defaultMapView.zoomLevel); // Set initial coordinates and zoom level
  //   this.dashboardMap.attributionControl.setPrefix('');

  //   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  //     maxZoom: 19,
  //     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  //   }).addTo(this.dashboardMap);

  // }

  // private addStationsToMap(): void {
  //   // Get all the stations and add them to leaflet as a layer.
  //   this.stationsCacheService.cachedStations.pipe(
  //     take(1)
  //   ).subscribe((data) => {
  //     const featureCollection: any = {
  //       "type": "FeatureCollection",
  //       "features": data.map(item => {
  //         return {
  //           "type": "Feature",
  //           "properties": {
  //             "id": item.id,
  //             "name": item.name,    // TODO. other properties
  //           },
  //           "geometry": {
  //             "type": "Point",
  //             "coordinates": [item.location?.longitude, item.location?.latitude]
  //           }
  //         };
  //       })
  //     };

  //     const stationLayer = L.geoJSON(featureCollection, { pointToLayer: this.stationMarkers }).addTo(this.dashboardMap);
  //     stationLayer.bringToFront();
  //   });
  // }

  // private stationMarkers(feature: any, latlng: any) {
  //   //console.log("latlong", latlng, feature);
  //   const marker = L.circleMarker(latlng, {
  //     radius: 5,
  //     fillColor: '#1330BF',
  //     color: '#1330BF',
  //     weight: 1,
  //     opacity: 1,
  //     fillOpacity: 0.8
  //   });

  //   marker.bindPopup(`${feature.properties.name}`);
  //   return marker;

  // }

  // TODO. Use later
  // private addregionsToMap(): void {
  //   this.regionsService.findAll().pipe(take(1)).subscribe((data) => {
  //     const regionsFeatureCollection: any = {
  //       "type": "FeatureCollection",
  //       "features": data.map(item => {
  //         return {
  //           "type": "Feature",
  //           "properties": {
  //             "name": item.name,    // TODO. 
  //           },
  //           "geometry": {
  //             "type": "MultiPolygon",
  //             "coordinates": item.boundary
  //           }
  //         };
  //       })
  //     };

  //     L.geoJSON(regionsFeatureCollection, {
  //       style: { fillColor: 'transparent', color: 'blue', weight: 0.5 }, // "opacity": 0.5 
  //       onEachFeature: this.onEachRegionFeature,
  //       //interactive: false
  //     }).addTo(this.dashboardMap);

  //   });
  // }

  // private onEachRegionFeature(feature: any, layer: any) {
  //   layer.bindPopup(`<p>Administrative Region: ${feature.properties.name} </p>`);
  // }



}
