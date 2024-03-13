
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewObservationQueryModel } from '../models/view-observation-query.model';
import { ViewObservationModel } from '../models/view-observation.model';
import { CreateObservationModel } from '../models/create-observation.model';
import { CreateObservationQueryModel } from '../models/create-observation-query.model';

@Injectable({
  providedIn: 'root'
})
export class ObservationsService {

  endPointUrl: string = "http://localhost:3000/observations";

  constructor(private http: HttpClient) { }

  private getQueryParams<T extends object>(params: T): HttpParams{
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
          httpParams = httpParams.set(key, value.toString());
        }
      }
    });
    return httpParams ;
  }

  public getObservationsRaw(selectObservation: CreateObservationQueryModel): Observable<CreateObservationModel[]> {
    return this.http.get<CreateObservationModel[]>(`${this.endPointUrl}/raw`, { params: this.getQueryParams<CreateObservationQueryModel>(selectObservation) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public getObservations(observationQuery: ViewObservationQueryModel ): Observable<ViewObservationModel[]> {
    return this.http.get<ViewObservationModel[]>(`${this.endPointUrl}`, { params: this.getQueryParams<ViewObservationQueryModel>(observationQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }



  public saveObservations(observations: CreateObservationModel[]): Observable<ViewObservationModel[]> {
    //console.log("saving", observations);
    return this.http.post<ViewObservationModel[]>(this.endPointUrl, observations)
      .pipe(
        catchError(this.handleError)
      );
  }

 public deleteObservations(ids: number[]): Observable<ViewObservationModel[]> {
    //todo use json as body of ids?
    //const url = `${this.endPointUrl}/${id}`; 
    const url = '';
    return this.http.delete<ViewObservationModel[]>(url)
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
