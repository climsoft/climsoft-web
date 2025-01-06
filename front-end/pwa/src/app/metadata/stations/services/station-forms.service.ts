import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, catchError, concat, from, map, tap, throwError } from 'rxjs';
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

  public find(stationId: string): Observable<ViewSourceModel[]> {
    // Step 1: Observable for fetching from the local database
    const localData$ = from(AppDatabase.instance.stationForms.get(stationId)).pipe(
      map(localData => {
        // If no cached data is found, emit an empty observable
        return localData ? localData.forms : [];
      })
    );

    // Step 2: Observable for fetching from the server
    const serverData$ = this.http.get<ViewSourceModel[]>(`${this.endPointUrl}/${stationId}`).pipe(
      tap(serverData => {
        if (serverData) {
          // Save the server data to the local database
          AppDatabase.instance.stationForms.put({ stationId: stationId, forms: serverData });
        }
      }),
      catchError((error) => {
        console.error('Error fetching station forms from server:', error);
        return EMPTY; // Emit nothing and complete
      })
    );

    // Step 3: Emit both cached and server data
    return concat(
      localData$, // Emit cached data first
      serverData$ // Then emit server data next
    );
  }

  public update(stationId: string, formIds: number[]): Observable<number[]> {
    const url = `${this.endPointUrl}/${stationId}`;
    return this.http.post<number[]>(url, formIds)
      .pipe(
        catchError(this.handleError)
      );
  }

  public delete(stationId: string, formIds: number[]): Observable<number[]> {
    const url = `${this.endPointUrl}/${stationId}`;
    return this.http.delete<number[]>(url, { body: formIds })
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
