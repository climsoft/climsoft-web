import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';

@Component({
  selector: 'app-view-stations-geo-map',
  templateUrl: './view-stations-geo-map.component.html',
  styleUrls: ['./view-stations-geo-map.component.scss']
})
export class ViewStationsGeoMapComponent implements OnChanges {

  @Input()
  public stations!: StationCacheModel[];

  protected stationMapLayerGroup: L.LayerGroup;

  protected stationsWithLocations!: StationCacheModel[];
  protected stationsWithOutLocations!: StationCacheModel[];

  constructor() {
    this.stationMapLayerGroup = L.layerGroup();
  }

  ngOnChanges(changes: SimpleChanges): void {

    console.log('view map changes raised');

    if (changes['stations'] && this.stations) {
      this.setupMap();
    }
  }

  private setupMap(): void {
    this.stationsWithLocations = this.stations.filter(station => (station.location !== null));
    this.stationsWithOutLocations = this.stations.filter(station => (station.location === null));
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

  private stationMarkers(feature: any, latlng: any) {
    // Get station data and component from feature properties 
    const station: StationCacheModel = feature.properties.station;

    //let colorValue = station ? '#3BD424' : '#F73E25';

    //console.log("latlong", latlng, feature);
    const marker = L.circleMarker(latlng, {
      radius: 6,
      fillColor: '#1330BF',
      color: '#1330BF',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });

    marker.bindPopup(station.name);

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
