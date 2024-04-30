import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CreateStationModel } from '../../models/stations/create-station.model';
import { ViewStationModel } from '../../models/stations/view-station.model';
import { UpdateStationModel } from '../../models/stations/update-station.model';
import { BaseStringAPIService } from '../base/base-string-api.service';

@Injectable({
  providedIn: 'root'
})
export class StationsService extends BaseStringAPIService<CreateStationModel, UpdateStationModel, ViewStationModel> {

  constructor(private http: HttpClient) {
    super(http, 'elements')
  }

}
