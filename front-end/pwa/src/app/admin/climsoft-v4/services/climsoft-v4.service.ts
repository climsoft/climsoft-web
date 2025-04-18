import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { ClimsoftV4ImportParametersModel } from '../models/climsoft-v4-import-parameters.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

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

  public getV4Conflicts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.endPointUrl}/v4-conflicts`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public connectToV4DB(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/connect`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public disconnectToV4DB(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/disconnect`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public importElements(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/import-elements`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public importStations(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/import-stations`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public saveObservationsToV4(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/save-observations`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  public getImportState(): Observable<V4OperationsResponse> {
    return this.http.get<V4OperationsResponse>(`${this.endPointUrl}/import-state`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public getClimsoftV4ImportParameters(): Observable<ClimsoftV4ImportParametersModel> {
    return this.http.get<ClimsoftV4ImportParametersModel>(`${this.endPointUrl}/v4-import-parameters`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public startObservationsImportFromV4(climsoftV4ImportParameters: ClimsoftV4ImportParametersModel): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/start-observations-import`, climsoftV4ImportParameters)
      .pipe(
        catchError(this.handleError)
      );
  }

  public stopObservationsImportFromV4(): Observable<V4OperationsResponse> {
    return this.http.post<V4OperationsResponse>(`${this.endPointUrl}/stop-observations-import`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      // TODO. show network connectivity message
      console.error('An error occurred:', error.error);
    }

    return throwError(() => error);
  }

}
