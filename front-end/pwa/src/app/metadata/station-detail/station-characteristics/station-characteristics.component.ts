import { Location } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViewElementModel } from 'src/app/core/models/view-element.model';
import { CreateUpdateStationModel } from 'src/app/core/models/create-update-station.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StationObservationMethodEnum } from 'src/app/core/models/enums/station-observation-method.enum';
import { StationStatusEnum } from 'src/app/core/models/enums/station-status.enum';
import { ViewStationModel } from 'src/app/core/models/view-station.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-station-characteristics',
  templateUrl: './station-characteristics.component.html',
  styleUrls: ['./station-characteristics.component.scss']
})
export class StationCharacteristicsComponent implements OnInit {
  @Input() public stationId!: string;
  protected station!: ViewStationModel;


  constructor(
    private pagesDataService: PagesDataService,
    private stationsService: StationsService,
  ) {

  }

  ngOnInit() {

    if (this.stationId) {
      this.loadStation();
    }

  }


  protected onStationEdited(): void {
    this.loadStation();
    // const message: string = action === "SUCCESS" ? "Station Added" : "Elements Deleted";
    // this.pagesDataService.showToast({ title: "Station Characteristics", message: message, type: "success" });
  }

  private loadStation(): void {
    this.stationsService.getStationCharacteristics(this.stationId).pipe(
      take(1)
    ).subscribe((data) => {
      this.station = data;
    });
  }


}
