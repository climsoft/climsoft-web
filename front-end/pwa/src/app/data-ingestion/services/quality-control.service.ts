
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { AppConfigService } from 'src/app/app-config.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SourceCheckDuplicateModel } from '../models/source-check-duplicate.model';

@Injectable({
  providedIn: 'root'
})
export class QualityControlService {

  private endPointUrl: string;

  constructor(
    private appConfigService: AppConfigService,
    private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/quality-control`;
  }

  public findDuplicates(viewObsQuery: ViewObservationQueryModel): Observable<SourceCheckDuplicateModel[]> {
    return this.http.get<SourceCheckDuplicateModel[]>(`${this.endPointUrl}/duplicates`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public countDuplicates(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count-duplicates`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public performQC(qcSelection: ViewObservationQueryModel): Observable<{ message: string, qcFails: number }> {
    return this.http.post<{ message: string , qcFails: number}>(`${this.endPointUrl}/perform-qc`, qcSelection);
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
