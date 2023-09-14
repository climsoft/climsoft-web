import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators'; 
import { Station } from '../models/station.model';

@Injectable({
  providedIn: 'root'
})
export class StationsService {

  endPointUrl: string = " http://localhost:3000/stations";

  constructor(private http: HttpClient) { }

  getStations(): Observable<Station[]> { 
    return this.http.get<Station[]>(this.endPointUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  getStation(stationId: number): Observable<Station> { 
    const url = `${this.endPointUrl}/${stationId}`;
    return this.http.get<Station>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  createStation(stationId: Station): Observable<Station> {
    return this.http.post<Station>(this.endPointUrl, stationId)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateStation(stationId: Station): Observable<Station> {
    const url = `${this.endPointUrl}/${stationId.id}`; 
    return this.http.patch<Station>(url, stationId)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteStation(stationId: number): Observable<Station> {
    //todo use json as body of ids?
    const url = `${this.endPointUrl}/${stationId}`; 
    return this.http.delete<Station>(url)
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
