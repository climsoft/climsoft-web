import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Station } from 'src/app/core/models/station.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations.service';

@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit {

  showCharacteristics: boolean =  true;
  showElements: boolean = false;
  showForms: boolean = false;
  showContacts: boolean = false;
  bEnableSave: boolean = false;
  station!: Station;

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private stationsService: StationsService,
  ) {
    this.pagesDataService.setPageHeader('Station Detail');
  }

  ngOnInit() {

    const stationId = this.route.snapshot.params['stationid'];

    this.stationsService.getStation(stationId).subscribe((data) => {
      this.station = data;
    });

  }

  onSaveClick(){

  }

  onCancelClick(){

  }

}
