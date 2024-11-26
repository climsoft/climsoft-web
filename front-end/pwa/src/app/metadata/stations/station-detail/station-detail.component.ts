import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { take } from 'rxjs'; 
import { StationObsProcessingMethodEnum } from 'src/app/core/models/stations/station-obs-Processing-method.enum';
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model';

@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit {
  protected station!: CreateStationModel;

  constructor(
    private pagesDataService: PagesDataService,
    private location: Location,
    private route: ActivatedRoute,
    private stationsService: StationsService,
  ) {
    this.pagesDataService.setPageHeader('Station Detail');
  }

  ngOnInit() {
    const stationId = this.route.snapshot.params['id'];
    this.stationsService.findOne(stationId).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.station = data;
      }
    });
  }


  protected get isManualorHybridStation(): boolean {
    return this.station.stationObsProcessingMethod === StationObsProcessingMethodEnum.MANUAL || this.station.stationObsProcessingMethod === StationObsProcessingMethodEnum.HYBRID
  }

  protected onDelete(): void {

    // TODO. Show an 'are you sure dialog'.

    this.stationsService.delete(this.station.id).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: "Station Deleted", message: `Station ${this.station.id} deleted`, type: "success" });
        this.location.back();
      }
    });

  }



}
