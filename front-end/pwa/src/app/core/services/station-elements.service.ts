import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { StationElementLimitModel } from '../models/station-element-limit.model';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewElementModel } from '../models/view-element.model';

@Injectable({
  providedIn: 'root'
})
export class StationElementsService {

  private endPointUrl: string = " http://localhost:3000/station-elements";

  constructor(private http: HttpClient) { }

  public getStationElements(stationId: string): Observable<ViewElementModel[]> {
    const url = `${this.endPointUrl}/elements/${stationId}`;
    return this.http.get<ViewElementModel[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  public saveStationElements(stationId: string, elementIds: number[]): Observable<number[]> {
    const url = `${this.endPointUrl}/elements/${stationId}`;
    return this.http.post<number[]>(url, elementIds)
      .pipe(
        catchError(this.handleError)
      );
  }

  public deleteStationElements(stationId: string, elementIds: number[]): Observable<number[]> {
    const url = `${this.endPointUrl}/elements/${stationId}`;
    return this.http.delete<number[]>(url, { body: elementIds })
      .pipe(
        catchError(this.handleError)
      );
  }

  public getStationElementLimits(stationId: string, elementId: number): Observable<StationElementLimitModel[]> {
    const url = `${this.endPointUrl}/element-limits/${stationId}/${elementId}`;
    return this.http.get<StationElementLimitModel[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  public saveStationElementLimits(stationId: string, elementId: number, elementLimit: StationElementLimitModel[]): Observable<StationElementLimitModel[]> {
    const url = `${this.endPointUrl}/element-limits/${stationId}/${elementId}`;
    return this.http.post<StationElementLimitModel[]>(url, elementLimit)
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
