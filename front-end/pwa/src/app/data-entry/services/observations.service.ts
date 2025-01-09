
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, concat, from, Observable, of, throwError } from 'rxjs';
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
  synced: 'true' | 'false'; // booleans are not indexable in indexdb and DexieJs so use 'true'|'false' for readabilty and semantics
  entryDatetime: Date; // Note. This represents the Date that record was added into the local database
}

@Injectable({
  providedIn: 'root'
})
export class ObservationsService {
  private endPointUrl: string;
  private isSyncing: boolean = false;
  private readonly _unsyncedObservations: BehaviorSubject<number> = new BehaviorSubject<number>(0);

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

  // TODO. Not used
  // This implementation was meant to check the local database first then the server.
  // It proved to be a bit risky because of potential stale values.
  private findEntryFormData1(entryFormObsQuery: EntryFormObservationQueryModel) {
    // Step 1: Observable for fetching from the local database
    const localData$ = from(this.getCachedEntryFormObservations(entryFormObsQuery));

    // Step 2: Observable for fetching from the server
    const serverData$ = this.http.get<CreateObservationModel[]>(
      `${this.endPointUrl}/raw`, { params: StringUtils.getQueryParams<EntryFormObservationQueryModel>(entryFormObsQuery) }).pipe(
        take(1),  // Ensure serverData$ emits once and completes
        tap(serverData => {
          if (serverData.length > 0) {
            // Save the server data to the local database
            this.saveDataToLocalDatabase(serverData, 'true');
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
            // Note, even though the 2 operations below are asynchronous they will execute sequentially.

            // If there is server data then update the local database with the new data asynchronously
            this.saveDataToLocalDatabase(observations, 'true'); 

            // Then refetch from the local database because there might be unsynced observations that should be displayed as well
            return from(this.fetchObservationsLocally(entryFormObsQuery));
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
  /**
   * Deletes synced data and gets unsynced data based on the query passed.
   * @param entryFormObsQuery 
   * @returns 
   */
  private async deleteSyncedDataAndGetUnsyncedData(entryFormObsQuery: EntryFormObservationQueryModel): Promise<CreateObservationModel[]> {
    // If no server data then this could mean it has either been deleted on the server or not synced from the user local database.
    // So check if data exists in the user local database and if it was already synced then delete it. 
    // If it was not synced then it means the server does not have it therefore return it.

    const localObsData = await this.getCachedEntryFormObservations(entryFormObsQuery);
    const syncedObsDataKeys: [string, number, number, number, string, number][] = []; // [stationId+elementId+sourceId+elevation+datetime+period]
    const unsyncedObsData: CachedObservationModel[] = [];

    for (const obsData of localObsData) {
      if (obsData.synced === 'true') {
        syncedObsDataKeys.push([entryFormObsQuery.stationId, obsData.elementId, entryFormObsQuery.sourceId, entryFormObsQuery.elevation, obsData.datetime, obsData.period]);
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
          //console.log('server value: ', value, 'saving synced data locally');
          // Save observations as synchronised and attempt to synchronise with server as well.
          this.saveDataToLocalDatabase(observations, 'true');
        },
        error: err => {
          if (err.status === 0) {
            console.warn('saving unsynced data locally');
            // If network error occurred save observations as unsynchronised and no need to send data to server
            this.saveDataToLocalDatabase(observations, 'false');
          }
        }
      }),
      map(value => {
        return `${observations.length} ${obsMessage} saved successfully`;
      }),
      catchError(err => {
        return err.status === 0 ? of(`${observations.length} ${obsMessage} saved locally`) : of(`${observations.length} ${obsMessage} NOT saved. Error: ${err.message}`);
      })
    );

  }

  /**
   * Saves observations to the local database and counts the number of unsynced observations
   * @param observations 
   * @param synced 
   */
  private async saveDataToLocalDatabase(observations: CreateObservationModel[], synced: 'true' | 'false') {
    await AppDatabase.instance.observations.bulkPut(observations.map(item => { return { ...item, synced: synced, entryDatetime: new Date() } }));
    this.countUnsyncedObservationsAndRaiseNotification();
  }

  public async syncObservations() {
    // If sync process is still on going then just return
    if (this.isSyncing) {
      return;
    }

    // Get total number of unsynced observations
    const totalUnsynced: number = await this.countUnsyncedObservationsAndRaiseNotification();

    // If there are no unsynced observations then set syncing flag to false and return
    if (totalUnsynced === 0) {
      this.isSyncing = false;
      return;
    }

    // Else send the unsynced data to server in batches of 1000
    this.isSyncing = true;
    const cachedObservations: CachedObservationModel[] = await AppDatabase.instance.observations
      .where('synced').equals('false').limit(1000).toArray();
    const observations: CreateObservationModel[] = this.convertToCreateObservationModels(cachedObservations);
    this.http.put(this.endPointUrl, observations).pipe(
      take(1),
      catchError(err => {
        this.isSyncing = false;
        // TODO. Notify network errors
        return this.handleError(err);
      }),
    ).subscribe(value => {
      // Server will send {message: success} when there is no error
      console.log('server response after sync: ', value, 'saving synced data locally');
      // set syncing flag to false to keep syncing    
      this.isSyncing = false;
      // save observations as synchronised 
      this.saveDataToLocalDatabase(observations, 'true');
      // Then synchronise remaining observations
      this.syncObservations();
    });

  }

  private async countUnsyncedObservationsAndRaiseNotification(): Promise<number> {
    // Get total number of unsynced observations
    const totalUnsynced: number = await AppDatabase.instance.observations.where('synced').equals('false').count();

    // Raise the event on number of unsynced observations
    this._unsyncedObservations.next(totalUnsynced);

    return totalUnsynced;
  }

  public get unsyncedObservations() {
    return this._unsyncedObservations.asObservable();
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
