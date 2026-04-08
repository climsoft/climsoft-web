import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationsCacheService } from '../services/stations-cache.service';
import { AppLocationService } from 'src/app/app-location.service';
import { CreateStationModel } from '../models/create-station.model';
import { StationStatusEnum } from '../models/station-status.enum';
import { StationProcessingMethodEnum } from '../models/station-processing-method.enum';
import { UpdateStationModel } from '../models/update-station.model';

@Component({
  selector: 'app-station-input-dialog',
  templateUrl: './station-input-dialog.component.html',
  styleUrls: ['./station-input-dialog.component.scss']
})
export class StationInputDialogComponent {
  @Output() public ok = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open: boolean = false;
  protected title!: string;
  protected station!: CreateStationModel;

  constructor(
    private stationsCacheService: StationsCacheService,
    private pagesDataService: PagesDataService,
    private locationService: AppLocationService,) { }

  public showDialog(stationId?: string): void {
    this.open = true;
    if (stationId) {
      this.title = "Edit Station";
      this.stationsCacheService.findOne(stationId).pipe(
        take(1),
      ).subscribe(station => {
        if (!station) throw new Error('station not found');
        this.station = {
          id: station.id,
          name: station.name,
          description: station.description,
          longitude: station.location?.longitude,
          latitude: station.location?.latitude,
          elevation: station.elevation || undefined,
          stationObsProcessingMethod: station.stationObsProcessingMethod || undefined,
          stationObsEnvironmentId: station.stationObsEnvironmentId,
          stationObsFocusId: station.stationObsFocusId,
          ownerId: station.ownerId,
          operatorId: station.operatorId,
          wmoId: station.wmoId,
          wigosId: station.wigosId,
          icaoId: station.icaoId,
          status: station.status || undefined,
          dateEstablished: station.dateEstablished,
          dateClosed: station.dateClosed,
          comment: station.comment,
        };
      });
    } else {
      this.title = "New Station";
      this.station = {
        id: '',
        name: '',
        stationObsProcessingMethod: StationProcessingMethodEnum.AUTOMATIC,
      };
    }

  }

  protected onLatitudeChange(latitude: number | null | undefined): void {
    this.station.latitude = latitude ?? undefined;
  }

  protected onLongitudeChange(longitude: number | null | undefined): void {
    this.station.longitude = longitude ?? undefined;
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

  protected onElevationChange(elevation: number | null | undefined): void {
    this.station.elevation = elevation ?? undefined;
  }


  protected onStationObsMethodChange(stationObservationMethodEnum: StationProcessingMethodEnum | undefined): void {
    this.station.stationObsProcessingMethod = stationObservationMethodEnum;
  }


  protected onStationStatusChange(status: StationStatusEnum | undefined): void {

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
      stationObsEnvironmentId: this.station.stationObsEnvironmentId || undefined,
      stationObsFocusId: this.station.stationObsFocusId || undefined,
      ownerId: this.station.ownerId || undefined,
      operatorId: this.station.operatorId || undefined,
      wmoId: this.station.wmoId || undefined,
      wigosId: this.station.wigosId || undefined,
      icaoId: this.station.icaoId || undefined,
      status: this.station.status || undefined,
      dateEstablished: dateEstablished || undefined,
      dateClosed: dateClosed || undefined,
      comment: this.station.comment || undefined,
    }

    let saveSubscription: Observable<CreateStationModel>;
    if (this.station.id) {
      saveSubscription = this.stationsCacheService.update(this.station.id, updateStation);
    } else {
      saveSubscription = this.stationsCacheService.create({ ...updateStation, id: this.station.id });
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe({
      next: (data) => {
        this.pagesDataService.showToast({ title: 'Station Characteristics', message: this.station.id ? 'New Station Created' : 'Station Updated', type: ToastEventTypeEnum.SUCCESS });
        this.stationsCacheService.checkForUpdates();
        this.ok.emit();
        this.open = false;
      },
      error: (err) => {
        console.error(err)
        this.pagesDataService.showToast({ title: 'Station Characteristics', message: 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onCancelClick(): void {
    this.cancelClick.emit();
    this.open = false;
  }


}
