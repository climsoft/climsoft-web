import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { take } from 'rxjs';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { StationObsProcessingMethodEnum } from 'src/app/core/models/stations/station-obs-Processing-method.enum';


@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent implements OnInit {
  protected stationId!: string;
  protected stationIsManualorHybrid!: boolean;

  constructor(
    private pagesDataService: PagesDataService,
    private location: Location,
    private route: ActivatedRoute,
    private stationsService: StationsService,
  ) {
    this.pagesDataService.setPageHeader('Station Detail');
  }

  ngOnInit() {
    this.stationId = this.route.snapshot.params['id'];
  }

  protected onStationCharacteristicsChanged(station: ViewStationModel) {
    this.stationIsManualorHybrid = station.stationObsProcessingMethod === StationObsProcessingMethodEnum.MANUAL || station.stationObsProcessingMethod === StationObsProcessingMethodEnum.HYBRID
  }

  protected onDelete(): void {

    // TODO. Show an 'are you sure dialog'.

    this.stationsService.delete(this.stationId).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: "Station Deleted", message: `Station ${this.stationId} deleted`, type: "success" });
        this.location.back();
      }
    });

  }



}
