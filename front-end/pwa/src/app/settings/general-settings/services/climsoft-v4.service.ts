import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';

export interface V4OperationsResponse {
  message: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ClimsoftV4Service {
  private endPointUrl: string;

  constructor(private appConfigService: AppConfigService, private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/climsoft-v4`;
  }

  public getConnectionState(): Observable<V4OperationsResponse> {
    return this.http.get<V4OperationsResponse>(`${this.endPointUrl}/connection-state`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public pullElements(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/pull-elements`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public pullStations(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/pull-stations`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public saveObservations(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/save-observations`, {})
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
    return throwError(() => new Error('Something bad happened. please try again later.'));
  }

}
