import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ElementModel } from 'src/app/core/models/element.model';
import { StationModel } from 'src/app/core/models/station.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-station-characteristics',
  templateUrl: './station-characteristics.component.html',
  styleUrls: ['./station-characteristics.component.scss']
})
export class StationCharacteristicsComponent implements OnInit {
  station!: StationModel;
  bEnableSave: boolean = true;//todo. should be false by default

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private stationsService: StationsService,
    private location: Location,
  ) {
    this.pagesDataService.setPageHeader("Station Characteristics");
  }

  ngOnInit() {

    const stationId: string = this.route.snapshot.params["id"]; 
    
    if (stationId === "new") {
      this.station = { id: "", name: '', description: "", comment: "" };
    } else {
      this.stationsService.getStationCharacteristics(stationId).subscribe((data) => {
        this.station = data;
      });
    }

  }

  protected onSaveClick(): void {
    //todo. do validations

    this.stationsService.saveStationCharacteristics([this.station]).subscribe((data) => {
      if (data && data.length > 0) {
        this.pagesDataService.showToast({
          title: 'Station Details', message: `${this.station.name} saved`, type: 'success'
        });

        this.location.back();
      }

    });

  }

  protected onCancelClick(): void {
    this.location.back();
  }
}
