import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core'; 
import { Observable, catchError, throwError } from 'rxjs';
import { ViewSourceModel } from '../../models/sources/view-source.model';

@Injectable({
  providedIn: 'root'
})
export class StationFormsService {

  private endPointUrl: string = " http://localhost:3000/station-forms";

  constructor(private http: HttpClient) { }

  public find(stationId: string): Observable<ViewSourceModel<object>[]> {
    const url = `${this.endPointUrl}/forms/${stationId}`;
    return this.http.get<ViewSourceModel<object>[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

 public update(stationId: string, formIds: number[]): Observable<number[]> {
    const url = `${this.endPointUrl}/forms/${stationId}`;
    return this.http.post<number[]>(url, formIds)
      .pipe(
        catchError(this.handleError)
      );
  }

  public delete(stationId: string, formIds: number[]): Observable<number[]> {
    const url = `${this.endPointUrl}/forms/${stationId}`;
    return this.http.delete<number[]>(url, { body: formIds })
      .pipe(
        catchError(this.handleError)
      );
  }


  //---todo. push to another class ----
  private handleError(error: HttpErrorResponse
    ) {
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
