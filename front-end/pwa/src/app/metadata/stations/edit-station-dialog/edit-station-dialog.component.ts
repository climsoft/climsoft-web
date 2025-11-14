import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Observable, take } from 'rxjs';
import { StationObsProcessingMethodEnum } from 'src/app/metadata/stations/models/station-obs-processing-method.enum';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { UpdateStationModel } from 'src/app/metadata/stations/models/update-station.model';
import { StationsCacheService } from '../services/stations-cache.service';
import { AppLocationService } from 'src/app/app-location.service';
import { CreateStationModel } from '../models/create-station.model';
import { StationStatusEnum } from '../models/station-status.enum';

@Component({
  selector: 'app-edit-station-dialog',
  templateUrl: './edit-station-dialog.component.html',
  styleUrls: ['./edit-station-dialog.component.scss']
})
export class EditStationDialogComponent {
  @Output() public ok = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open: boolean = false;
  protected title!: string;
  protected station!: CreateStationModel;
  protected bNew: boolean = false;

  constructor(
    private stationsCacheService: StationsCacheService,
    private pagesDataService: PagesDataService,
    private locationService: AppLocationService,) { }

  public showDialog(stationId?: string): void {
    if (stationId) {
      this.title = "Edit Station";
      this.stationsCacheService.findOne(stationId).pipe(
        take(1),
      ).subscribe(foundStation => {
        if (foundStation) {
          this.bNew = false;
          this.station = {
            id: foundStation.id,
            name: foundStation.name,
            description: foundStation.description,
            longitude: foundStation.location ? foundStation.location.longitude : null,
            latitude: foundStation.location ? foundStation.location.latitude : null,
            elevation: foundStation.elevation,
            stationObsProcessingMethod: foundStation.stationObsProcessingMethod,
            stationObsEnvironmentId: foundStation.stationObsEnvironmentId,
            stationObsFocusId: foundStation.stationObsFocusId,
            organisationId: foundStation.organisationId,
            wmoId: foundStation.wmoId,
            wigosId: foundStation.wigosId,
            icaoId: foundStation.icaoId,
            status: foundStation.status,
            dateEstablished: foundStation.dateEstablished,
            dateClosed: foundStation.dateClosed,
            comment: foundStation.comment,
          };
        }
      });
    } else {
      this.bNew = true;
      this.title = "New Station";
      this.station = {
        id: "",
        name: "",
        description: "",
        longitude: 0,
        latitude: 0,
        elevation: 0,
        stationObsProcessingMethod: StationObsProcessingMethodEnum.AUTOMATIC,
        stationObsEnvironmentId: 0,
        stationObsFocusId: 0,
        organisationId: 0,
        wmoId: null,
        wigosId: null,
        icaoId: null,
        status: null,
        dateEstablished: '',
        dateClosed: '',
        comment: '',
      };
    }

    this.open = true;
  }

  protected requestLocation(): void {
    this.locationService.getUserLocation().pipe(take(1)).subscribe({
      next: (location) => {
        this.station.latitude = location.latitude;
        this.station.longitude = location.longitude;
      },
      error: (error) => {
        this.pagesDataService.showToast({ title: "Station Location", message: error, type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onStationObsMethodChange(stationObservationMethodEnum: StationObsProcessingMethodEnum | null): void {
    this.station.stationObsProcessingMethod = stationObservationMethodEnum ? stationObservationMethodEnum : StationObsProcessingMethodEnum.AUTOMATIC;
  }


  protected onStationStatusChange(status: StationStatusEnum | null): void {

    // TODO. Enforce not allowing date closed when the station status is indicated as closed
    if (status && status === StationStatusEnum.CLOSED) {

    }

  }

  protected onOkClick(): void {
    if (!this.station.id) {
      this.pagesDataService.showToast({ title: this.title, message: 'Station Id Required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.station.name) {
      this.pagesDataService.showToast({ title: this.title, message: 'Station Name Required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    // TODO. Do more validations

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
      latitude: this.station.latitude,
      longitude: this.station.longitude,
      elevation: this.station.elevation,
      stationObsProcessingMethod: this.station.stationObsProcessingMethod,
      stationObsEnvironmentId: this.station.stationObsEnvironmentId ? this.station.stationObsEnvironmentId : null,
      stationObsFocusId: this.station.stationObsFocusId ? this.station.stationObsFocusId : null,
      organisationId: this.station.organisationId ? this.station.organisationId : null,
      wmoId: this.station.wmoId ? this.station.wmoId : null,
      wigosId: this.station.wigosId ? this.station.wigosId : null,
      icaoId: this.station.icaoId ? this.station.icaoId : null,
      status: this.station.status ? this.station.status : null,
      dateEstablished: dateEstablished,
      dateClosed: dateClosed,
      comment: this.station.comment ? this.station.comment : null,
    }

    let saveSubscription: Observable<CreateStationModel>;
    if (this.bNew) {
      saveSubscription = this.stationsCacheService.create({ ...updateStation, id: this.station.id });
    } else {
      saveSubscription = this.stationsCacheService.update(this.station.id, updateStation);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe((data) => {
      let message: string;
      let messageType: ToastEventTypeEnum;
      if (data) {
        message = this.bNew ? "New Station Created" : "Station Updated";
        messageType = ToastEventTypeEnum.SUCCESS;
      } else {
        message = "Error in saving station";
        messageType = ToastEventTypeEnum.ERROR;
        //return;
      }

      this.pagesDataService.showToast({ title: "Station Characteristics", message: message, type: messageType });
      this.open = false;
      this.stationsCacheService.checkForUpdates();
      this.ok.emit();
    });
  }

  protected onCancelClick(): void {
    this.cancelClick.emit();
  }


}
