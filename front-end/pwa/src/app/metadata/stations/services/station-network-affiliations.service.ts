import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, concat, from, map, take, tap, throwError } from 'rxjs';
import { AppDatabase } from 'src/app/app-database';
import { AppConfigService } from 'src/app/app-config.service';
import { ViewNetworkAffiliationModel } from '../../network-affiliations/models/view-network-affiliation.model';
import { StationCountPerNetworkAffiliationCount } from '../models/station-count-per-network-affiliation-count';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Injectable({
  providedIn: 'root'
})
export class StationNetworkAffiliationsService {
  private endPointUrl: string;

  constructor(private appConfigService: AppConfigService, private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/station-network-affiliations`;
  }

  public getNetworkAffiliationsAssignedToStation(stationId: string): Observable<ViewNetworkAffiliationModel[]> {
    // Step 1: Observable for fetching from the local database
    const localData$ = from(AppDatabase.instance.stationNetworks.get(stationId)).pipe(
      map(localData => {
        // If no cached data is found, emit an empty observable
        return localData ? localData.networkAffiliations : [];
      })
    );

    // Step 2: Observable for fetching from the server
    const serverData$ = this.http.get<ViewNetworkAffiliationModel[]>(`${this.endPointUrl}/network-affiliations-assigned-to-station/${stationId}`).pipe(
      take(1), // Ensure serverData$ emits once and completes
      tap(serverData => {
        // Save the server data to the local database. This ensures that the local database is in sync with the server database.
        AppDatabase.instance.stationNetworks.put({ stationId: stationId, networkAffiliations: serverData });
      }),
      catchError(this.handleError)
    );

    // Step 3: Emit both cached and server data
    return concat(
      localData$, // Emit cached data first
      serverData$ // Then emit server data next
    );
  }

  public putNetworkAffiliationsAssignedToStations(stationId: string, networkAffiliationIds: number[]): Observable<number[]> {
    return this.http.put<number[]>(`${this.endPointUrl}/network-affiliations-assigned-to-station/${stationId}`, networkAffiliationIds)
      .pipe(
        catchError(this.handleError)
      );
  }


  public getStationCountPerNetworkAffiliation(): Observable<StationCountPerNetworkAffiliationCount[]> {
    return this.http.get<{ networkAffiliationId: number; stationCount: number }[]>(`${this.endPointUrl}/stations-count-per-network-affiliation`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public getStationsAssignedToNetworkAffiliations(networkAffiliationIds: number[]): Observable<string[]> {
    const params = new HttpParams().set('networkAffiliationIds', networkAffiliationIds.join(','));
    return this.http.get<string[]>(`${this.endPointUrl}/stations-assigned-to-network-affiliations`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

    

  public putStationsAssignedToNetworkAffiliation(networkAffiliationId: number, stationIds: string[]): Observable<string[]> {
    return this.http.put<string[]>(`${this.endPointUrl}/stations-assigned-to-network-affiliation/${networkAffiliationId}`, stationIds)
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
