import { Component, OnInit } from '@angular/core';
import { StationModel } from '../../core/models/station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-stations',
  templateUrl: './stations.component.html',
  styleUrls: ['./stations.component.scss']
})
export class StationsComponent implements OnInit {

  stations!: StationModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private stationsService: StationsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Stations Metadata');

    this.stationsService.getStations().subscribe(data => {
      this.stations = data;
    });


  }

  ngOnInit() {
  }

   onSearchClick() {}

   onNewStationClick() {
    this.router.navigate(['station-detail','new'], { relativeTo: this.route.parent });
  }

   onEditStationClick(station: StationModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }



}
