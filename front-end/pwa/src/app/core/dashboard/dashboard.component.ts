import { HttpClient } from '@angular/common/http';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { Observable } from 'rxjs';
import { PagesDataService } from '../services/pages-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {

  private map: any;

  constructor( private pagesDataService: PagesDataService, private http: HttpClient) {

    this.pagesDataService.setPageHeader('Dashboard');
    

  }

private  getGeoJSONData(url: string): Observable<any> {
    return this.http.get(url);
  }

 

  ngOnInit(): void {
    //this.initMap();
  }

  ngAfterViewInit(): void {

    this.getGeoJSONData('http://localhost:3000/file').subscribe(  data => {
      console.log('GeoJSON data loaded successfully:', data);
      this.initMap(data);
    }
  );
   
  }

  private initMap(geojsonData : any): void {
    this.map = L.map('map').setView([0.0236, 37.9062], 6); // Set initial coordinates and zoom level
    const map = this.map;

    map.attributionControl.setPrefix('');

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Load and add GeoJSON data for the country boundary
    const countryBoundary = L.geoJSON(geojsonData, {
      style: {
        fillColor: 'transparent',
        color: 'blue',  // Border color
        weight: 2,      // Border width
      },
    }).addTo(map);

    // Fit the map to the bounds of the country boundary
    //map.fitBounds(countryBoundary.getBounds());

    // const marker=  L.marker([51.5, -0.09]).addTo(this.map);
    // marker.bindPopup("<b>Hello world!</b><br>I am a popup.");

    // L.popup()
    //   .setLatLng([51.513, -0.09])
    //   .setContent("I am a standalone popup.")
    //   .openOn(this.map);

  }

}
