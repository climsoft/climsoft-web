
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ObservationModel } from '../models/observation.model';
import { SelectObservation } from '../models/dtos/select-observation.model';
import { ViewObservationDto } from '../models/dtos/view-observation.model';

@Injectable({
  providedIn: 'root'
})
export class ObservationsService {

  endPointUrl: string = "http://localhost:3000/observations";

  constructor(private http: HttpClient) { }

  //TODO. This shpuld later be generalised
  private getQueryParams(selectObservation: SelectObservation): { [key: string]: any } {
    const obsParams: { [key: string]: any } = {};

    for (const key in selectObservation) {
      if (selectObservation.hasOwnProperty(key)) {
        const value = selectObservation[key as keyof SelectObservation];
        if (value !== undefined) {
          obsParams[key] = value;
        }
      }
    }

    return obsParams
  }

  public getObservationsRaw(selectObservation: SelectObservation): Observable<ObservationModel[]> {
    return this.http.get<ObservationModel[]>(`${this.endPointUrl}/raw`, { params: this.getQueryParams(selectObservation) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public getObservations(selectObservation: SelectObservation): Observable<ViewObservationDto[]> {
    return this.http.get<ViewObservationDto[]>(`${this.endPointUrl}`, { params: this.getQueryParams(selectObservation) })
      .pipe(
        catchError(this.handleError)
      );
  }



  public saveObservations(observations: ObservationModel[]): Observable<ObservationModel[]> {
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
