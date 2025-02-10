import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subject, catchError, concat, from, map, take, tap, throwError } from 'rxjs';
import { ViewSourceModel } from '../../sources/models/view-source.model';
import { AppDatabase } from 'src/app/app-database';
import { AppConfigService } from 'src/app/app-config.service';

@Injectable({
  providedIn: 'root'
})
export class StationFormsService {

  private endPointUrl: string;

  constructor(private appConfigService: AppConfigService, private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/station-forms`;
  }

  public getStationCountPerForm(): Observable<{ formId: number; stationCount: number }[]> {
    return this.http.get<{ formId: number; stationCount: number }[]>( `${this.endPointUrl}/stations-count-per-form`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public getFormsAssignedToStations(stationId: string): Observable<ViewSourceModel[]> {
    // Step 1: Observable for fetching from the local database
    const localData$ = from(AppDatabase.instance.stationForms.get(stationId)).pipe(
      map(localData => {
        // If no cached data is found, emit an empty observable
        return localData ? localData.forms : [];
      })
    );

    // Step 2: Observable for fetching from the server
    const serverData$ = this.http.get<ViewSourceModel[]>(`${this.endPointUrl}/forms-assigned-to-station/${stationId}`).pipe(
      take(1), // Ensure serverData$ emits once and completes
      tap(serverData => {
        // Save the server data to the local database. This ensures that the local database is in sync with the server database.
        AppDatabase.instance.stationForms.put({ stationId: stationId, forms: serverData });
      }),
      catchError(this.handleError)
    );

    // Step 3: Emit both cached and server data
    return concat(
      localData$, // Emit cached data first
      serverData$ // Then emit server data next
    );
  }

  public putFormsAssignedToStations(stationId: string, formIds: number[]): Observable<number[]> {
    return this.http.put<number[]>(`${this.endPointUrl}/forms-assigned-to-station/${stationId}`, formIds)
      .pipe(
        catchError(this.handleError)
      );
  }

  public deleteFormsAssignedToStations(stationId: string) {
    return this.http.delete(`${this.endPointUrl}/forms-assigned-to-station/${stationId}`)
      .pipe(
        catchError(this.handleError)
      );
  }
 
  public getStationsAssignedToUseForm(formId: number): Observable<string[]> {
          return this.http.get<string[]>(`${this.endPointUrl}/stations-assigned-to-use-form/${formId}`)
        .pipe(
          catchError(this.handleError)
        );
    }
    
    public putStationsAssignedToUseForm(formId: number, stationIds: string[]): Observable<string[]> {
      return this.http.put<string[]>(`${this.endPointUrl}/stations-assigned-to-use-form/${formId}`, stationIds)
        .pipe(
          catchError(this.handleError)
        );
    }

    public deleteStationsAssignedToUseForm(formId: number){
      return this.http.delete(`${this.endPointUrl}/stations-assigned-to-use-form/${formId}`)
        .pipe(
          catchError(this.handleError)
        );
    }

  

  // TODO. Push to another class 
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
