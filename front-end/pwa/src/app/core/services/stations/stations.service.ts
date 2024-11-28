import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { CreateStationModel } from '../../models/stations/create-station.model'; 
import { UpdateStationModel } from '../../models/stations/update-station.model';
import { Observable, throwError } from 'rxjs';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ViewStationQueryModel } from '../../models/stations/view-station-query.model';
import { environment } from 'src/environments/environment';
import { ViewStationModel } from '../../models/stations/view-station.model';

// TODO. Delete this service

@Injectable({
  providedIn: 'root'
})
export class StationsService {
  private endPointUrl: string = `${environment.apiUrl}/stations`;

  constructor(
    private http: HttpClient) {

  }

  // TODO. Delete
  public findOne(id: string): Observable<ViewStationModel> {
    const url = `${this.endPointUrl}/id/${id}`;
    return this.http.get<ViewStationModel>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // TODO. Delete
  public find(viewQuery?: ViewStationQueryModel): Observable<ViewStationModel[]> {
    let httpParams: HttpParams = new HttpParams();
    if (viewQuery) {
      httpParams = StringUtils.getQueryParams<ViewStationQueryModel>(viewQuery)
    }
    return this.http.get<ViewStationModel[]>(`${this.endPointUrl}`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  // TODO. Delete
  public count(viewQuery: ViewStationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count`, { params: StringUtils.getQueryParams<ViewStationQueryModel>(viewQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public create(createDto: CreateStationModel): Observable<CreateStationModel> {
    return this.http.post<CreateStationModel>(`${this.endPointUrl}`, createDto)
      .pipe(
        catchError(this.handleError)
      );
  }

  public update(id: number | string, updateDto: UpdateStationModel): Observable<CreateStationModel> {
    return this.http.patch<CreateStationModel>(`${this.endPointUrl}/${id}`, updateDto)
      .pipe(
        catchError(this.handleError)
      );
  }

  public delete(id: string): Observable<string> {
    return this.http.delete<string>(`${this.endPointUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public get downloadLink(): string {
    return `${this.endPointUrl}/download`;
  }

  private handleError(error: HttpErrorResponse) {

    //console.log('auth error', error)

    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(`Backend returned code ${error.status}, body was: `, error.error);
    }
    // Return an observable with a user-facing error message.
    return throwError(() => new Error('Something bad happened. please try again later.'));
  }

}
