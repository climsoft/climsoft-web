
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewObservationQueryModel } from '../../models/observations/view-observation-query.model';
import { ViewObservationModel } from '../../models/observations/view-observation.model';
import { CreateObservationModel } from '../../models/observations/create-observation.model';
import { CreateObservationQueryModel } from '../../models/observations/create-observation-query.model';
import { ViewObservationLogQueryModel } from '../../models/observations/view-observation-log-query.model';
import { ViewObservationLogModel } from '../../models/observations/view-observation-log.model';
import { DeleteObservationModel } from '../../models/observations/delete-observation.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Injectable({
  providedIn: 'root'
})
export class ObservationsService {

  private endPointUrl: string = "http://localhost:3000/observations";

  constructor(private http: HttpClient) { }

 

  public findProcessed(viewObsQuery: ViewObservationQueryModel): Observable<ViewObservationModel[]> {
    return this.http.get<ViewObservationModel[]>(`${this.endPointUrl}`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public count(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }


  public findRaw(createObsQuery: CreateObservationQueryModel): Observable<CreateObservationModel[]> {
    return this.http.get<CreateObservationModel[]>(`${this.endPointUrl}/raw`, { params: StringUtils.getQueryParams<CreateObservationQueryModel>(createObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public findObsLog(observationQuery: ViewObservationLogQueryModel): Observable<ViewObservationLogModel[]> {
    return this.http.get<ViewObservationLogModel[]>(`${this.endPointUrl}/log`, { params: StringUtils.getQueryParams<ViewObservationLogQueryModel>(observationQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public save(observations: CreateObservationModel[]) {
    return this.http.put(this.endPointUrl, observations)
      .pipe(
        catchError(this.handleError)
      ); 
  }

  public restore(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.patch<number>(`${this.endPointUrl}/restore`, observations)
      .pipe(
        catchError(this.handleError)
      );
  }

  public softDelete(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.delete<number>(`${this.endPointUrl}/soft`, { body: observations })
      .pipe(
        catchError(this.handleError)
      );
  }

  public hardDelete(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.delete<number>(`${this.endPointUrl}/hard`, { body: observations })
      .pipe(
        catchError(this.handleError)
      );
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
