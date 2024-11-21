import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet'; 
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache-service';

@Component({
  selector: 'app-view-stations-map',
  templateUrl: './view-stations-map.component.html',
  styleUrls: ['./view-stations-map.component.scss']
})
export class ViewStationsMapComponent implements OnChanges {

  @Input()
  public stations!: StationCacheModel[];

  protected stationMapLayerGroup: L.LayerGroup;

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
    const featureCollection: any = {
      "type": "FeatureCollection",
      "features": this.stations.map(item => {
        return {
          "type": "Feature",
          "properties": {
            "id": item.id,
            "name": item.name,    // TODO. 
          },
          "geometry": {
            "type": "Point",
            "coordinates": [item.longitude, item.latitude]
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


}
