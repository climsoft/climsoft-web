import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CreateUpdateStationModel } from '../../models/stations/create-update-station.model';  
import { ViewStationModel } from '../../models/stations/view-station.model';

@Injectable({
  providedIn: 'root'
})
export class StationsService {

  private endPointUrl: string = " http://localhost:3000/stations";

  constructor(private http: HttpClient) { }

 public getStations(stationIds?: string[]): Observable<ViewStationModel[]> {
    let params: HttpParams = new HttpParams();

    if (stationIds && stationIds.length > 0) {
      params = params.set('ids', stationIds.join(','));
    }

    return this.http.get<ViewStationModel[]>(this.endPointUrl, { params: params })
      .pipe(
        catchError(this.handleError)
      );
  }

  public getStationCharacteristics(stationId: string): Observable<ViewStationModel> {
    const url = `${this.endPointUrl}/${stationId}`;
    return this.http.get<ViewStationModel>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  public saveStationCharacteristics(station: CreateUpdateStationModel): Observable<ViewStationModel> {
    console.log("saving station: ", station);

    return this.http.post<ViewStationModel>(this.endPointUrl, station)
      .pipe(
        catchError(this.handleError)
      );
  }

  public delete(stationId: string): Observable<ViewStationModel> {
    const url = `${this.endPointUrl}/${stationId}`;
    return this.http.delete<ViewStationModel>(url)
      .pipe(
        catchError(this.handleError)
      );
  }


  //---todo. push to another class ----
  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(`Backend returned code ${error.status}, body was: `, error.error);
    }
    // Return an observable with a user-facing error message.
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }

}
