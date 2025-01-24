import { Component, AfterViewInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import { take } from 'rxjs';
import { ClimsoftBoundaryModel } from 'src/app/admin/general-settings/models/settings/climsoft-boundary.model';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import * as L from 'leaflet';
import * as turf from "@turf/turf";

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit, OnChanges {
  @Input()
  public mapContentLayerGroup!: L.LayerGroup;

  // Generate a random map id to make user it's alway unique
  protected mapContainerId: string = `map_${Math.random().toString()}`;

  // Create the overall content layer group. This will contains all other layers displayed on the map.
  private mapOverallContentLayerGroup: L.LayerGroup = L.layerGroup();

  // Create the climsoft boundary layer group to show the boundaries of climsoft operations 
  private boundaryMapLayerGroup: L.LayerGroup = L.layerGroup();

  protected climsoftBoundary!: ClimsoftBoundaryModel;
  private map!: L.Map;

  constructor(private generalSettingsService: GeneralSettingsService,) { }

  ngAfterViewInit(): void {
    // Load the climsoft boundary setting.
    this.generalSettingsService.findOne(2).pipe(
      take(1)
    ).subscribe((data) => {
      if (data && data.parameters) {
        this.climsoftBoundary = data.parameters as ClimsoftBoundaryModel
        this.setupMap();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.mapContentLayerGroup) {
      this.mapOverallContentLayerGroup.clearLayers();

      this.boundaryMapLayerGroup.addTo(this.mapOverallContentLayerGroup);
      this.mapContentLayerGroup.addTo(this.mapOverallContentLayerGroup);
    }
  }

  private setupMap(): void {
    // Only set up the map when the container id has been given and the boundary setting has been loaded
    // If the map has already been set up, then no need to set it up again
    if (!(this.mapContainerId && this.climsoftBoundary && !this.map)) {
      return;
    } 

    // create the leaflet map
    this.map = L.map(this.mapContainerId).setView(
      [
        this.climsoftBoundary.latitude,
        this.climsoftBoundary.longitude
      ],
      this.climsoftBoundary.zoomLevel); // Set initial coordinates and zoom level

    // Remove ukraine flag
    this.map.attributionControl.setPrefix('');

    // Add tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);


    // If boundary coordinates provided, then add them to the boundary layer for visibility
    if (this.climsoftBoundary.boundary) {
      const multipolygon = turf.multiPolygon(this.climsoftBoundary.boundary);
      L.geoJSON(multipolygon, {
        style: { fillColor: 'transparent', color: '#1330BF', weight: 0.5 }, // "opacity": 0.5 
      }).addTo(this.boundaryMapLayerGroup);
    }

    // Add content layer group to the map
    this.mapOverallContentLayerGroup.addTo(this.map);

  }

}
