import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; 
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewElementModel } from '../../models/elements/view-element.model'; 
import { ViewStationObsFocusModel } from '../../models/stations/view-station-obs-focus.model';

@Injectable({
  providedIn: 'root'
})
export class StationObsFocusesService {

  private endPointUrl: string = " http://localhost:3000/station-observation-focuses";

  constructor(private http: HttpClient) { }


  public getStationObsFocuses(ids?: number[]): Observable<ViewStationObsFocusModel[]> {
    let params: HttpParams = new HttpParams();
    
    if (ids && ids.length > 0) {
      params = params.set('ids', ids.join(','));
    }
  
    return this.http.get<ViewElementModel[]>(this.endPointUrl, { params: params })
      .pipe(catchError(this.handleError));
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
