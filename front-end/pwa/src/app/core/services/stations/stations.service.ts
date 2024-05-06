import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {  map } from 'rxjs/operators';
import { CreateStationModel } from '../../models/stations/create-station.model';
import { ViewStationModel } from '../../models/stations/view-station.model';
import { UpdateStationModel } from '../../models/stations/update-station.model';
import { BaseStringAPIService } from '../base/base-string-api.service';
import { StationObsProcessingMethodEnum } from '../../models/stations/station-obs-Processing-method.enum';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class StationsService extends BaseStringAPIService<CreateStationModel, UpdateStationModel, ViewStationModel> {

  constructor(private http: HttpClient) {
    super(http, 'stations')
  }

  /**
   * Retrieves stations of the passed observation processing methods
   * @param obsProcessingMethods to retriev
   * @returns 
   */
  public findByObsProcessingMethod(obsProcessingMethods: StationObsProcessingMethodEnum[]): Observable<ViewStationModel[]> {
  return  super.findAll().pipe(
      map(data => data.filter(item =>  obsProcessingMethods.includes(item.stationObsProcessingMethod) ))
    );
  }

}
