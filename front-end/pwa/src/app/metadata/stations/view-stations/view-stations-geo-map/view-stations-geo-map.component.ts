import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { StationStatusEnum } from '../../models/station-status.enum';

@Component({
  selector: 'app-view-stations-geo-map',
  templateUrl: './view-stations-geo-map.component.html',
  styleUrls: ['./view-stations-geo-map.component.scss']
})
export class ViewStationsGeoMapComponent implements OnChanges {
  @Input() public mapHeight: string = '80vh';  
  @Input() public stations!: StationCacheModel[];
  @Input() public displayStats: boolean = true;

  protected stationMapLayerGroup!: L.LayerGroup;

  protected stationsWithLocations!: StationCacheModel[];
  protected numOfStationsWithOutLocations: number = 0;
  protected numOfOperationalStations: number = 0;
  protected numOfClosedStations!: number;
  protected numOfUnknownStations!: number;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stations'] && this.stations) {
      this.setupMap();
    }
  }

  private setupMap(): void {
    this.stationsWithLocations = [];
    this.numOfStationsWithOutLocations = 0;
    this.numOfOperationalStations = 0;
    this.numOfClosedStations = 0;
    this.numOfUnknownStations = 0
    for (const station of this.stations) {
      if (station.location) {
        this.stationsWithLocations.push(station)
      } else {
        this.numOfStationsWithOutLocations = this.numOfStationsWithOutLocations + 1;
      }
      switch (station.status) {
        case StationStatusEnum.OPERATIONAL:
          this.numOfOperationalStations = this.numOfOperationalStations + 1;
          break;
        case StationStatusEnum.CLOSED:
          this.numOfClosedStations = this.numOfClosedStations + 1;
          break;
        case StationStatusEnum.UKNOWNN:
          this.numOfUnknownStations = this.numOfUnknownStations + 1;
          break;
        default:
          throw new Error(`Developer error: Station with unrecognised status: ${station.id}`);
      }

    }

    // Set up a new layer group
    this.stationMapLayerGroup = L.layerGroup();
    const featureCollection: any = {
      "type": "FeatureCollection",
      "features": this.stationsWithLocations.map(station => {
        return {
          "type": "Feature",
          "properties": {
            "station": station,
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
    const station: StationCacheModel = feature.properties.station;

    let colorValue;
    switch (station.status) {
      case StationStatusEnum.OPERATIONAL:
        colorValue = '#3bd424';//'#00FF00';
        break;
      case StationStatusEnum.CLOSED:
        colorValue = '#C6C6C6';//'#1330BF'; 
        break;
      case StationStatusEnum.UKNOWNN:
        colorValue = '#F73E25';
        break;
      default:
        throw new Error(`Developer error: Station status unknown: ${station.id}`);
    }

    //console.log("latlong", latlng, feature);
    const marker = L.circleMarker(latlng, {
      radius: 7,
      fillColor: colorValue,
      color: '#ffffff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });

    marker.bindPopup(`${station.id} - ${station.name}`);

    // Show the popup on mouseover
    marker.on('mouseover', () => {
      marker.openPopup();
    });

    // Hide the popup on mouseout
    marker.on('mouseout', () => {
      marker.closePopup();
    });

    return marker;
  }


}
