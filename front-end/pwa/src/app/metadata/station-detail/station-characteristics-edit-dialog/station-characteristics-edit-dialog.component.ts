import { Component, EventEmitter, Output } from '@angular/core';
import { pipe, take } from 'rxjs';
import { StationObsProcessingMethodEnum } from 'src/app/core/models/stations/station-obs-Processing-method.enum';
import { CreateUpdateStationModel } from 'src/app/core/models/stations/create-update-station.model';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({
  selector: 'app-station-characteristics-edit-dialog',
  templateUrl: './station-characteristics-edit-dialog.component.html',
  styleUrls: ['./station-characteristics-edit-dialog.component.scss']
})
export class StationCharacteristicsEditDialogComponent {
  @Output() public ok = new EventEmitter<"SUCCESS" | "ERROR">();

  protected open: boolean = false;
  protected title: string = "";
  protected station!: CreateUpdateStationModel;

  constructor(
    private stationsService: StationsService,
    private pagesDataService: PagesDataService,) { }


  public openDialog(stationId?: string): void {

    this.open = true;

    if (stationId) {
      this.title = "Edit Station";
      this.stationsService.getStationCharacteristics(stationId).pipe(
        take(1)
      ).subscribe((data) => {
        this.station = data;

        if (this.station.dateEstablished) {
          this.station.dateEstablished = this.station.dateEstablished.substring(0, 10);
        }

        if (this.station.dateClosed) {
          this.station.dateClosed = this.station.dateClosed.substring(0, 10);
        }

      });

    } else {
      this.title = "New Station";
      this.station = {
        id: "",
        name: "",
        description: "",
        location: { x: 0, y: 0 },
        elevation: 0,
        stationObsProcessingMethod: StationObsProcessingMethodEnum.AUTOMATIC,
        stationObsEnvironmentId: null,
        stationObsFocusId: null,
        wmoId: null,
        wigosId: null,
        icaoId: null,
        status: null,
        dateEstablished: null,
        dateClosed: null,
        comment: ""
      };
    }

  }

  protected onLongitudeChange(longitude: number | null): void {
    this.station.location.x = longitude ? longitude : 0;
  }

  protected onLatitudeChange(latitude: number | null): void {
    this.station.location.y = latitude ? latitude : 0;
  }

  protected onElevationChange(elevation: number | null): void {
    this.station.elevation = elevation ? elevation : 0;
  }

  protected onStationObsChange(stationObservationMethodEnum: StationObsProcessingMethodEnum | null): void {
    this.station.stationObsProcessingMethod = stationObservationMethodEnum ? stationObservationMethodEnum : StationObsProcessingMethodEnum.AUTOMATIC;
  }

  protected onOkClick(): void {

    // TODO. Do validations

    let dateEstablished: string | null = null;
    let dateClosed: string | null = null;

    if (this.station.dateEstablished) {
      dateEstablished = `${this.station.dateEstablished}T00:00:00.000Z`;
    }

    if (this.station.dateClosed) {
      dateClosed = `${this.station.dateClosed}T00:00:00.000Z`;
    }


    const createOrUpdateStation: CreateUpdateStationModel = {
      id: this.station.id,
      name: this.station.name,
      description: this.station.description,
      location: this.station.location,
      elevation: this.station.elevation,
      stationObsProcessingMethod: this.station.stationObsProcessingMethod,
      stationObsEnvironmentId: this.station.stationObsEnvironmentId,
      stationObsFocusId: this.station.stationObsFocusId,
      wmoId: this.station.wmoId,
      wigosId: this.station.wigosId,
      icaoId: this.station.icaoId,
      status: this.station.status,
      dateEstablished: dateEstablished,
      dateClosed: dateClosed,
      comment: this.station.comment,
    }

    this.stationsService.saveStationCharacteristics(createOrUpdateStation).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        const message: string = this.title === "Edit Station" ? "Station edited" : "Station created";
        this.pagesDataService.showToast({ title: "Station Characteristics", message: message, type: "success" });
        this.ok.emit("SUCCESS");
      }
    });


  }
}
