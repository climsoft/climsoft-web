import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Observable, take } from 'rxjs';
import { StationObsProcessingMethodEnum } from 'src/app/core/models/stations/station-obs-Processing-method.enum';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { UpdateStationModel } from 'src/app/core/models/stations/update-station.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { CreateStationModel } from 'src/app/core/models/stations/create-station.model';
import { StationsCacheService } from '../../services/stations-cache.service';
import { AppLocationService } from 'src/app/app-location.service';

@Component({
  selector: 'app-station-characteristics-edit-dialog',
  templateUrl: './station-characteristics-edit-dialog.component.html',
  styleUrls: ['./station-characteristics-edit-dialog.component.scss']
})
export class StationCharacteristicsEditDialogComponent implements OnChanges {
  @Input()
  public open!: boolean;

  @Input()
  public editStationId!: string;

  @Output()
  public ok = new EventEmitter<void>();

  @Output()
  public cancelClick = new EventEmitter<void>();

  protected title: string = "";
  protected station!: CreateStationModel;
  protected bNew: boolean = false;


  constructor(
    private stationsCacheService: StationsCacheService,
    private pagesDataService: PagesDataService,
    private locationService: AppLocationService,) { }


  ngOnChanges(changes: SimpleChanges): void {
    if (this.open) {
      this.setupDialog(this.editStationId);
    }
  }

  public openDialog(stationId?: string): void {
    this.open = true;
    this.setupDialog(stationId);
  }

  private setupDialog(stationId?: string): void {
    if (stationId) {
      this.title = "Edit Station";
      this.stationsCacheService.findOne(stationId).pipe(
        take(1),
      ).subscribe(foundStation => {
        if (foundStation) {
          this.station = {
            id: foundStation.id,
            name: foundStation.name,
            description: foundStation.description,
            longitude: foundStation.location ? foundStation.location.longitude : null,
            latitude: foundStation.location ? foundStation.location.latitude : null,
            elevation: foundStation.elevation,
            stationObsProcessingMethod: StationObsProcessingMethodEnum.AUTOMATIC,
            stationObsEnvironmentId: foundStation.stationObsEnvironmentId,
            stationObsFocusId: foundStation.stationObsFocusId,
            wmoId: foundStation.wmoId,
            wigosId: foundStation.wigosId,
            icaoId: foundStation.icaoId,
            status: foundStation.status,
            dateEstablished: foundStation.dateEstablished,
            dateClosed: foundStation.dateClosed,
            comment: foundStation.comment,
          };
          this.bNew = false;
          if (this.station.dateEstablished) {
            this.station.dateEstablished = this.station.dateEstablished;
          }

          if (this.station.dateClosed) {
            this.station.dateClosed = this.station.dateClosed;
          }
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
        wmoId: null,
        wigosId: null,
        icaoId: null,
        status: null,
        dateEstablished: '',
        dateClosed: '',
        comment: '',
      };
    }
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

  protected onOkClick(): void {

    if (StringUtils.isNullOrEmpty(this.station.id) || StringUtils.isNullOrEmpty(this.station.name)) {
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
      stationObsEnvironmentId: this.station.stationObsEnvironmentId,
      stationObsFocusId: this.station.stationObsFocusId,
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
