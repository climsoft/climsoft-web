import { Component, OnInit } from '@angular/core';
import { CreateStationModel } from '../../../core/models/stations/create-station.model';
import { ActivatedRoute, Router } from '@angular/router';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-stations',
  templateUrl: './stations.component.html',
  styleUrls: ['./stations.component.scss']
})
export class StationsComponent {

  protected stations!: ViewStationModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private stationsService: StationsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Stations Metadata');

    this.loadStations();

  }

  protected loadStations(): void {
    this.stationsService.findAll().pipe(
      take(1)
    ).subscribe(data => {
      this.stations = data;
    });
  }
 
  protected onSearch(): void { }

  protected onImportStations(): void {
    this.router.navigate(['import-station'], { relativeTo: this.route.parent }); 
  }

  protected onEditStation(station: CreateStationModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }


}
