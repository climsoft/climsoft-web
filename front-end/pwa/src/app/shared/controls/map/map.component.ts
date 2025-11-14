import { Component, AfterViewInit, Input, SimpleChanges, OnChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ClimsoftBoundaryModel } from 'src/app/admin/general-settings/models/settings/climsoft-boundary.model';
import * as L from 'leaflet';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit, OnChanges {
  @Input() public mapHeight: string = '80vh';
  @Input() public contentLayersGroup!: L.LayerGroup;


  // Generate a random map id to make user it's alway unique
  protected mapContainerId: string = `map_${Math.random().toString()}`;

  // Create the overall content layer group. This contains all other layers displayed on the map.
  private allLayersGroup: L.LayerGroup = L.layerGroup();

  // Create the climsoft boundary layer group to show the boundaries of climsoft operations 
  // private boundaryMapLayerGroup: L.LayerGroup = L.layerGroup();

  protected climsoftBoundary!: ClimsoftBoundaryModel;
  private map!: L.Map;

   private destroy$ = new Subject<void>();

  constructor(private cachedMetadataService: CachedMetadataService) { }

  ngAfterViewInit(): void {
    // Load the climsoft boundary setting.
    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.cachedMetadataService.getGeneralSetting(SettingIdEnum.CLIMSOFT_BOUNDARY);
      this.climsoftBoundary = this.cachedMetadataService.getGeneralSetting(SettingIdEnum.CLIMSOFT_BOUNDARY).parameters as ClimsoftBoundaryModel;
      // Settting of the map has been done under the `setTimeout` because 
      // leaflet throws an error of map container not found
      // when this component is used in a dialog like the station search dialog.
      // As of 08/09/2025, its not clear why the map container is not being found considering
      // `setupMap` is being called under `ngAfterViewInit`
      setTimeout(() => {
        this.setupMap();
      }, 0);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentLayersGroup'] && this.contentLayersGroup) {
      this.allLayersGroup.clearLayers();
      //this.boundaryMapLayerGroup.addTo(this.allLayersGroup);
      this.contentLayersGroup.addTo(this.allLayersGroup);
    }
  }

   ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    // if (this.climsoftBoundary.boundary) {
    //   const multipolygon = turf.multiPolygon(this.climsoftBoundary.boundary);
    //   L.geoJSON(multipolygon, {
    //     style: { fillColor: 'transparent', color: '#1330BF', weight: 0.5 }, // "opacity": 0.5 
    //   }).addTo(this.boundaryMapLayerGroup);
    // }

    // Add content layer group to the map
    this.allLayersGroup.addTo(this.map);

  }

}
