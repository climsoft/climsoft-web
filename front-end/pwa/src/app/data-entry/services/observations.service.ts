
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { concat, from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { ViewObservationQueryModel } from '../../core/models/observations/view-observation-query.model';
import { ViewObservationModel } from '../../core/models/observations/view-observation.model';
import { CreateObservationModel } from '../../core/models/observations/create-observation.model';
import { EntryFormObservationQueryModel } from '../models/entry-form-observation-query.model';
import { ViewObservationLogQueryModel } from '../../core/models/observations/view-observation-log-query.model';
import { ViewObservationLogModel } from '../../core/models/observations/view-observation-log.model';
import { DeleteObservationModel } from '../../core/models/observations/delete-observation.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { AppConfigService } from 'src/app/app-config.service';
import { AppDatabase } from 'src/app/app-database';

export interface CachedObservationModel extends CreateObservationModel {
  synced: boolean;
  entryDatetime: Date; // Note. This represents the Date that record was added into the local database
}

@Injectable({
  providedIn: 'root'
})
export class ObservationsService {
  private endPointUrl: string;

  constructor(private appConfigService: AppConfigService, private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/observations`;
  }

  public findProcessed(viewObsQuery: ViewObservationQueryModel): Observable<ViewObservationModel[]> {
    return this.http.get<ViewObservationModel[]>(`${this.endPointUrl}`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public findObsLog(observationQuery: ViewObservationLogQueryModel): Observable<ViewObservationLogModel[]> {
    return this.http.get<ViewObservationLogModel[]>(`${this.endPointUrl}/log`, { params: StringUtils.getQueryParams<ViewObservationLogQueryModel>(observationQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public count(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  // This implementation was meant to check the local database first then the server.
  // It proved to be a bit risky because of potential stale values.
  public findEntryFormData1(entryFormObsQuery: EntryFormObservationQueryModel) {
    // Step 1: Observable for fetching from the local database
    const localData$ = from(this.getCachedEntryFormObservations(entryFormObsQuery));

    // Step 2: Observable for fetching from the server
    const serverData$ = this.http.get<CreateObservationModel[]>(
      `${this.endPointUrl}/raw`, { params: StringUtils.getQueryParams<EntryFormObservationQueryModel>(entryFormObsQuery) }).pipe(
        take(1),  // Ensure serverData$ emits once and completes
        tap(serverData => {
          if (serverData.length > 0) {
            // Save the server data to the local database
            AppDatabase.instance.observations.bulkPut(serverData.map(item => { return { ...item, synced: true, entryDatetime: new Date() } }));
          }
        }),
        switchMap(serverData => {
          // If there is server data then just return it as it is.
          // If no server data then this could mean it has either been deleted on the server or not synced from the user local database
          // So check if data exists in the user's local database and if it was already synced then delete it and return empty array. 
          // TODO.

          return from(this.getCachedEntryFormObservations(entryFormObsQuery));
        }),
        catchError(this.handleError)
      );

    // Step 3: Emit both cached and server data
    return concat(
      localData$, // Emit cached data first
      serverData$ // Then emit server data next
    );
  }

  // This implementation checks the server first then the local database. It is simpler but takes time to show contents on the entry forms
  public findEntryFormData(entryFormObsQuery: EntryFormObservationQueryModel): Observable<CreateObservationModel[]> {
    return this.http.get<CreateObservationModel[]>(`${this.endPointUrl}/raw`, { params: StringUtils.getQueryParams<EntryFormObservationQueryModel>(entryFormObsQuery) })
      .pipe(
        switchMap(observations => {
          if (observations.length > 0) {
            console.log('syncing observations: ', observations)
            // If there is server data then just update the local database with the new data asynchronously and return the server data.
            AppDatabase.instance.observations.bulkPut(observations.map(item => { return { ...item, synced: true, entryDatetime: new Date() } }));
            return of(observations);
          } else {
            // If no server data then this could mean it has either been deleted on the server or not synced from the user local database.
            // So operate on the response accordingly.
            return from(this.deleteSyncedDataAndGetUnsyncedData(entryFormObsQuery));
          }
        }),
        catchError(err => {
          if (err.status === 0) {
            // For network errors. Attempt fetching data locally
            console.warn('Network error detected. Fetching data locally.');
            return from(this.fetchObservationsLocally(entryFormObsQuery));
          } else {
            // For other errors handle them normally 
            return this.handleError(err);
          }

        })
      );
  }
  private async deleteSyncedDataAndGetUnsyncedData(entryFormObsQuery: EntryFormObservationQueryModel): Promise<CreateObservationModel[]> {
    // If no server data then this could mean it has either been deleted on the server or not synced from the user local database.
    // So check if data exists in the user local database and if it was already synced then delete it. 
    // If it was not synced then it means the server does not have it therefore return it.

    const localObsData = await this.getCachedEntryFormObservations(entryFormObsQuery);
    const syncedObsDataKeys: [string, number, number, number, string, number][] = []; // [stationId+elementId+sourceId+elevation+datetime+period]
    const unsyncedObsData: CachedObservationModel[] = [];

    for (const obsData of localObsData) {
      if (obsData.synced) {
        syncedObsDataKeys.push([entryFormObsQuery.stationId,obsData.elementId, entryFormObsQuery.sourceId, entryFormObsQuery.elevation, obsData.datetime, obsData.period]);
      } else {
        unsyncedObsData.push(obsData);
      }
    }

    await AppDatabase.instance.observations.bulkDelete(syncedObsDataKeys);

    return this.convertToCreateObservationModels(unsyncedObsData);
  }


  private async fetchObservationsLocally(entryFormObsQuery: EntryFormObservationQueryModel): Promise<CreateObservationModel[]> {
    const cachedData: CachedObservationModel[] = await this.getCachedEntryFormObservations(entryFormObsQuery);
    return this.convertToCreateObservationModels(cachedData);
  }

  private async getCachedEntryFormObservations(entryFormObsQuery: EntryFormObservationQueryModel): Promise<CachedObservationModel[]> {
    // Use Compound index [stationId+sourceId+elevation+elementId+datetime]
    const filters: [string, number, number, number, string][] = [];
    for (const elementId of entryFormObsQuery.elementIds) {
      for (const datetime of entryFormObsQuery.datetimes) {
        const filter: [string, number, number, number, string] = [
          entryFormObsQuery.stationId, entryFormObsQuery.sourceId, entryFormObsQuery.elevation, elementId, datetime
        ];
        filters.push(filter)
      }
    }

    const cachedObservations: CachedObservationModel[] = await AppDatabase.instance.observations
      .where('[stationId+sourceId+elevation+elementId+datetime]')
      .anyOf(filters).toArray();

    return cachedObservations;
  }

  private convertToCreateObservationModels(cachedObservations: CachedObservationModel[]): CreateObservationModel[] {
    return cachedObservations.map((cachedObservation) => ({
      stationId: cachedObservation.stationId,
      elementId: cachedObservation.elementId,
      sourceId: cachedObservation.sourceId,
      elevation: cachedObservation.elevation,
      datetime: cachedObservation.datetime,
      period: cachedObservation.period,
      value: cachedObservation.value,
      flag: cachedObservation.flag,
      comment: cachedObservation.comment,
    }));
  }

  /**
   * Used by data entry forms to send data to server
   * @param observations 
   * @returns 
   */
  public bulkPutDataFromEntryForm(observations: CreateObservationModel[]): Observable<string> {
    const obsMessage: string = 'observation' + (observations.length === 1 ? '' : 's');
    return this.http.put(this.endPointUrl, observations).pipe(
      tap({
        next: value => {
          // Server will send {message: success} when there is no error
          console.log('server value: ', value);
          // Save observations as synchronised
          AppDatabase.instance.observations.bulkPut(observations.map(item => { return { ...item, synced: true, entryDatetime: new Date() } }));
        },
        error: err => {
          if (err.status === 0) {
            // If network error occurred save observations as unsynchronised
            console.warn('saving data locally');
            AppDatabase.instance.observations.bulkPut(observations.map(item => { return { ...item, synced: false, entryDatetime: new Date() } }));
          }
        }
      }),
      map(value => {
        console.log('server response: ', value);
        return `${observations.length} ${obsMessage} saved successfully`;
      }),
      catchError(err => {
        console.warn('Data entry error handled:', err);
        return err.status === 0 ? of(`${observations.length} ${obsMessage} saved locally`) : of(`${observations.length} ${obsMessage} NOT saved. Error: ${err.message}`);
      })
    );

  }

  public restore(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.patch<number>(`${this.endPointUrl}/restore`, observations)
      .pipe(
        catchError(this.handleError)
      );
  }

  public softDelete(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.delete<number>(`${this.endPointUrl}/soft`, { body: observations })
      .pipe(
        catchError(this.handleError)
      );
  }

  public hardDelete(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.delete<number>(`${this.endPointUrl}/hard`, { body: observations })
      .pipe(
        catchError(this.handleError)
      );
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
