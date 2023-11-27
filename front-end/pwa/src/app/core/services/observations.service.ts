
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ObservationModel } from '../models/observation.model';
import { SelectObservation } from '../models/select-observation.model';

@Injectable({
  providedIn: 'root'
})
export class ObservationsService {

  endPointUrl: string = "http://localhost:3000/observations";

  constructor(private http: HttpClient) { }


  getObservations(selectObservation: SelectObservation): Observable<ObservationModel[]> {

    const obsParams: { [key:string]: any } = {};

    for (const key in selectObservation) {
      if (selectObservation.hasOwnProperty(key)) {
        const value = selectObservation[key as keyof SelectObservation];
        if (value !== undefined) {
          obsParams[key] = value; 
        }
      }
    }

    //console.log('observation params', obsParams);   

    return this.http.get<ObservationModel[]>(this.endPointUrl, { params: obsParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  saveObservations(observations: ObservationModel[]): Observable<ObservationModel[]> {
    return this.http.post<ObservationModel[]>(this.endPointUrl, observations)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteObservations(ids: number[]): Observable<ObservationModel[]> {
    //todo use json as body of ids?
    //const url = `${this.endPointUrl}/${id}`; 
    const url = '';
    return this.http.delete<ObservationModel[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }


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
