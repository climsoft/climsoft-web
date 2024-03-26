import { Component, EventEmitter, Output } from '@angular/core';
import { take } from 'rxjs';
import { StationObservationMethodEnum } from 'src/app/core/models/enums/station-observation-method.enum';
import { CreateUpdateStationModel } from 'src/app/core/models/create-update-station.model';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

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
      this.stationsService.getStationCharacteristics(stationId).subscribe((data) => {
        console.log("data", data);
        this.station = data;
      });
    } else {
      this.title = "New Station";
      this.station = {
        id: "",
        name: "",
        description: "",
        location: { x: 0, y: 0 },
        elevation: 0,
        stationObsMethod: StationObservationMethodEnum.AUTOMATIC,
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

  protected onStationObsChange(stationObservationMethodEnum: StationObservationMethodEnum | null): void {
    this.station.stationObsMethod = stationObservationMethodEnum ? stationObservationMethodEnum : StationObservationMethodEnum.AUTOMATIC;
  }

  protected onOkClick(): void {

    // TODO. Do validations

    const createOrUpdateStation: CreateUpdateStationModel = {
      id: this.station.id,
      name: this.station.name,
      description:  this.station.description,
      location:  this.station.location ,
      elevation: this.station. elevation,
      stationObsMethod:  this.station.stationObsMethod ,
      stationObsEnvironmentId:  this.station.stationObsEnvironmentId,
      stationObsFocusId:  this.station.stationObsFocusId, 
      wmoId:  this.station.wmoId, 
      wigosId:  this.station.wigosId,
      icaoId: this.station. icaoId,
      status:  this.station.status,
      dateEstablished: this.station. dateEstablished,
      dateClosed:  this.station.dateClosed,
      comment:  this.station.comment,
    }
  

    this.stationsService.saveStationCharacteristics(createOrUpdateStation ).pipe(
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
