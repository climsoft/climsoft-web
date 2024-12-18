import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';
import { ViewRegionModel } from 'src/app/core/models/Regions/view-region.model';

@Component({
  selector: 'app-view-regions-map',
  templateUrl: './view-regions-map.component.html',
  styleUrls: ['./view-regions-map.component.scss']
})
export class ViewRegionsMapComponent implements OnChanges {
  @Input()
  public regions!: ViewRegionModel[];

  protected regionMapLayerGroup: L.LayerGroup;

  constructor() {
    this.regionMapLayerGroup = L.layerGroup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.regions) {
      this.setupMap();
    }
  }

  private setupMap(): void {
    const regionsFeatureCollection: any = {
      "type": "FeatureCollection",
      "features": this.regions.map(item => {
        return {
          "type": "Feature",
          "properties": {
            "name": item.name,
          },
          "geometry": {
            "type": "MultiPolygon",
            "coordinates": item.boundary
          }
        };
      })
    };

    // TODO.  In future the region types will each have different colors
    L.geoJSON(regionsFeatureCollection, {
      style: { fillColor: 'transparent', color: 'blue', weight: 0.5 }, // "opacity": 0.5 
      onEachFeature: this.onEachRegionFeature,
    }).addTo(this.regionMapLayerGroup);
  }

  private onEachRegionFeature(feature: any, layer: any) {
    layer.bindPopup(`<p>${feature.properties.name} </p>`);
  }

}
