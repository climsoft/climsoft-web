import { Component, OnInit } from '@angular/core';
import { CreateStationModel } from '../../core/models/stations/create-station.model';
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
export class StationsComponent implements OnInit {

  stations!: ViewStationModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private stationsService: StationsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Stations Metadata');

    this.loadStations();

  }

  ngOnInit() {
  }

  protected onSearchClick() { }

  protected onNewStationAddedClick() {
    this.loadStations();
  }

  protected onEditStationClick(station: CreateStationModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }

  private loadStations(): void {
    this.stationsService.findAll().pipe(
      take(1)
    ).subscribe(data => {
      this.stations = data;
    });
  }


}
