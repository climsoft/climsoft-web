
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewObservationQueryModel } from '../../models/observations/view-observation-query.model'; 

export interface DuplicateModel{
 stationId: string;
   elementId: number;
  elevation: number;
  datetime: string
  period: number;
  duplicates: number;
}

@Injectable({
  providedIn: 'root'
})
export class SourceCheckService {

  private endPointUrl: string = "http://localhost:3000/source-check";

  constructor(private http: HttpClient) { }

  private getQueryParams<T extends object>(params: T): HttpParams {
    let httpParams: HttpParams = new HttpParams();

    // Dynamically add parameters if they are present
    Object.keys(params).forEach(key => {
      const value = params[key as keyof T];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Join array values with comma for query parameters
          httpParams = httpParams.set(key, value.join(','));
        } else {
          // Convert non-array values to string
          // TODO, what about booleans? Investigate what effects string booleans mya have on dtos at the back end. 
          httpParams = httpParams.set(key, value.toString());
        }
      }
    });
    return httpParams;
  }

  public find(viewObsQuery: ViewObservationQueryModel): Observable<DuplicateModel[]> {
    return this.http.get<DuplicateModel[]>(`${this.endPointUrl}`, { params: this.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public count(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count`, { params: this.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public sum(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/sum`, { params: this.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
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
