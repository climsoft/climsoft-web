import { Component, AfterViewInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import * as L from 'leaflet';
import { take } from 'rxjs';
import { SettingIds } from 'src/app/core/models/settings/setting-ids';
import { Settings1ParamsModel } from 'src/app/core/models/settings/settings-params/settings-1-params.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { RegionsService } from 'src/app/core/services/regions/regions.service';
import { GeneralSettingsService } from 'src/app/core/services/settings/general-settings.service';
import { StationsService } from 'src/app/core/services/stations/stations.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit, OnChanges {

  @Input()
  public mapContainerId!: string;

  @Input()
  public mapContentLayerGroup!: L.LayerGroup;

  private map: any;
 
  private mapOverallContentLayerGroup: L.LayerGroup;
  private defaultMapView!: Settings1ParamsModel;

  constructor(
    private pagesDataService: PagesDataService,
    private generalSettingsService: GeneralSettingsService,
    private stationsService: StationsService,
    private regionsService: RegionsService) {

    this.pagesDataService.setPageHeader('Dashboard');

   

    this.mapOverallContentLayerGroup = L.layerGroup();

  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit')
    this.setupMap();
  }


  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges')
 
   

    if (changes['mapContentLayerGroup'] && this.mapContentLayerGroup) {
      this.mapOverallContentLayerGroup.clearLayers();
      this.mapContentLayerGroup.addTo(this.mapOverallContentLayerGroup);

      // for (const layer of this.mapContentLayers) {
      //   layer.addTo(this.mapContentLayerGroup);
      // }
    }


  }



  private setupMap(): void {

    console.log('mapContainerId', this.mapContainerId)
    if (!this.mapContainerId) {
      return;
    }

    if (this.map) {
      return;
    }

    if (!this.defaultMapView) {
      this.generalSettingsService.findOne(SettingIds.DEFAULT_MAP_VIEW).pipe(take(1)).subscribe((data) => {
        if (data && data.parameters) {
         
          this.defaultMapView = data.parameters as Settings1ParamsModel

          console.log('defaultMapView', this.defaultMapView)
          this.setupMap();
        }
      });
      return;
    }

    console.log('SETTING UP MAP')

    this.map = L.map(this.mapContainerId).setView(
      [
        this.defaultMapView.latitude,
        this.defaultMapView.longitude
      ],
      this.defaultMapView.zoomLevel); // Set initial coordinates and zoom level

    // Remove ukraine flag
    this.map.attributionControl.setPrefix('');

    // Add tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    // Add content layer group
    this.mapOverallContentLayerGroup.addTo(this.map);

  }



  private initMap2(defaultMapView: Settings1ParamsModel): void {
    this.map = L.map(this.mapContainerId).setView(
      [defaultMapView.latitude, defaultMapView.longitude],
      defaultMapView.zoomLevel); // Set initial coordinates and zoom level

    // Remove ukraine flag
    this.map.attributionControl.setPrefix('');

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

  }

  private addStationsToMap(): void {
    // Get all the stations and add them to leaflet as a layer.
    this.stationsService.find().pipe(take(1)).subscribe((data) => {
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
              "coordinates": [item.longitude, item.latitude]
            }
          };
        })
      };

      const stationLayer = L.geoJSON(featureCollection, { pointToLayer: this.stationMarkers }).addTo(this.map);
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
      }).addTo(this.map);

    });
  }

  private onEachRegionFeature(feature: any, layer: any) {
    layer.bindPopup(`<p>Administrative Region: ${feature.properties.name} </p>`);
  }



}
