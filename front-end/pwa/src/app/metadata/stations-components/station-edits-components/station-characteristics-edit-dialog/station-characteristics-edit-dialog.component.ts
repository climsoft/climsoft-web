import { Component, EventEmitter,  Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { StationObsProcessingMethodEnum } from 'src/app/core/models/stations/station-obs-Processing-method.enum';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { UpdateStationModel } from 'src/app/core/models/stations/update-station.model';

@Component({
  selector: 'app-station-characteristics-edit-dialog',
  templateUrl: './station-characteristics-edit-dialog.component.html',
  styleUrls: ['./station-characteristics-edit-dialog.component.scss']
})
export class StationCharacteristicsEditDialogComponent {
  @Output() 
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = "";
  protected station!: ViewStationModel;
  protected bNew: boolean = false;

  constructor( private stationsService: StationsService, private pagesDataService: PagesDataService,) { }


  public openDialog(stationId?: string): void {
    this.open = true;
    if (stationId) {
      this.title = "Edit Station";
      this.stationsService.findOne(stationId).pipe(
        take(1)
      ).subscribe((data) => {
        this.station = data;
        this.bNew = false;

        if (this.station.dateEstablished) {
          this.station.dateEstablished = this.station.dateEstablished.substring(0, 10);
        }

        if (this.station.dateClosed) {
          this.station.dateClosed = this.station.dateClosed.substring(0, 10);
        }

      });

    } else {
      this.bNew = true;
      this.title = "New Station";
      this.station = {
        id: "",
        name: "",
        description: "",
        location: { longitude: 0, latitude: 0 },
        elevation: 0,
        stationObsProcessingMethod: StationObsProcessingMethodEnum.AUTOMATIC,
        stationObsProcessingMethodName: '',
        stationObsEnvironmentId: null,
        stationObsEnvironmentName: null,
        stationObsFocusId: null,
        stationObsFocusName: null,
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


    const updateStation: UpdateStationModel = {
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

    let saveSubscription: Observable<ViewStationModel>;
    if (this.bNew) {
      saveSubscription = this.stationsService.create({ ...updateStation, id: this.station.id });
    } else {
      saveSubscription = this.stationsService.update(this.station.id, updateStation);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe((data) => {
      let message: string;
      let messageType: 'success' | 'error';
      if (data) {
         message = this.bNew ? "New Station Created" : "Station Updated";
         messageType= 'success';
      }else{
        message= "Error in saving element";
        messageType= 'error';
      }

      this.pagesDataService.showToast({ title: "Station Characteristics", message: message, type: messageType });
      this.ok.emit();
    });


  }
}
