
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, concat, from, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { ViewObservationQueryModel } from '../models/view-observation-query.model';
import { ViewObservationModel } from '../models/view-observation.model';
import { CreateObservationModel } from '../models/create-observation.model';
import { EntryFormObservationQueryModel } from '../models/entry-form-observation-query.model';
import { ViewObservationLogQueryModel } from '../models/view-observation-log-query.model';
import { ViewObservationLogModel } from '../models/view-observation-log.model';
import { DeleteObservationModel } from '../models/delete-observation.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { AppConfigService } from 'src/app/app-config.service';
import { AppDatabase } from 'src/app/app-database';
import { LastStationActivityObservation } from '../models/last-station-activity-observation.model';
import { StationStatusQueryModel } from 'src/app/data-monitoring/station-status/models/station-status-query.model';
import { StationStatusDataQueryModel } from 'src/app/data-monitoring/station-status/models/station-status-data-query.model';
import { DataAvailabilityQueryModel } from 'src/app/data-monitoring/data-availability/models/data-availability-query.model';
import { DataAvailabilityStatusModel } from '../models/data-availability-status.model';

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
  constructor(
    private appConfigService: AppConfigService, 
    private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/observations`;
  }


  public findProcessed(viewObsQuery: ViewObservationQueryModel): Observable<ViewObservationModel[]> {
    return this.http.get<ViewObservationModel[]>(`${this.endPointUrl}`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  // TODO. There should be a limit requirement for performance reasons
  public count(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(
      `${this.endPointUrl}/count`,
      { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public findObsLog(observationQuery: ViewObservationLogQueryModel): Observable<ViewObservationLogModel[]> {
    return this.http.get<ViewObservationLogModel[]>(
      `${this.endPointUrl}/log`,
      { params: StringUtils.getQueryParams<ViewObservationLogQueryModel>(observationQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public countObsNotSavedToV4(): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count-v4-unsaved-observations`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public generateExport(exportTemplateId: number, viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(
      `${this.endPointUrl}/generate-export/${exportTemplateId}`,
      { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public getDownloadExportLink(exportTemplateId: number): string {
    return `${this.endPointUrl}/download-export/${exportTemplateId}`;
  }

  public findCorrectionData(viewObsQuery: ViewObservationQueryModel): Observable<CreateObservationModel[]> {
    return this.http.get<CreateObservationModel[]>(`${this.endPointUrl}/correction-data`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public countCorrectionData(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count-correction-data`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * This implementation checks the server first then the local database. 
   * It takes time to fetch data when user is offline
   * @param entryFormObsQuery 
   * @returns 
   */
  public findEntryFormData(entryFormObsQuery: EntryFormObservationQueryModel): Observable<CreateObservationModel[]> {
    return this.http.get<CreateObservationModel[]>(`${this.endPointUrl}/form-data`, { params: StringUtils.getQueryParams<EntryFormObservationQueryModel>(entryFormObsQuery) })
      .pipe(
        switchMap(observations => {
          if (observations.length > 0) {
            return of(observations);
          } else {
            // If no server data then this could mean it has either;
            // 1. Never been saved to the server
            // 2. Been deleted on the server 
            // 3. or not synced to the server from the user device
            // So fetch locally
            return from(this.fetchObservationsLocally(entryFormObsQuery));
          }
        }),
        catchError(err => {
          if (err.status === 0) {
            // For network errors. Always attempt fetching data locally
            console.warn('Network error detected. Fetching data locally.');
            return from(this.fetchObservationsLocally(entryFormObsQuery));
          } else {
            // For other errors handle them normally 
            return this.handleError(err);
          }

        })
      );
  }

  private async fetchObservationsLocally(entryFormObsQuery: EntryFormObservationQueryModel): Promise<CreateObservationModel[]> {
    // Use Compound index [stationId+sourceId+level+elementId+datetime]
    const filters: [string, number, number, number, string][] = [];
    const toDate = new Date(entryFormObsQuery.toDate);
    const datetimes: string[] = []
    for (let dt = new Date(entryFormObsQuery.fromDate); dt <= toDate; dt.setHours(dt.getHours() + 1)) {
      datetimes.push(dt.toISOString());
    }

    //console.log('date times: ', datetimes);

    for (const elementId of entryFormObsQuery.elementIds) {
      for (const datetime of datetimes) {
        const filter: [string, number, number, number, string] = [
          entryFormObsQuery.stationId, entryFormObsQuery.sourceId, entryFormObsQuery.level, elementId, datetime
        ];
        filters.push(filter)
      }
    }

    const cachedObservations: CachedObservationModel[] = await AppDatabase.instance.observations
      .where('[stationId+sourceId+level+elementId+datetime]')
      .anyOf(filters).toArray();

    return this.convertToCreateObservationModels(cachedObservations);
  }

  private convertToCreateObservationModels(cachedObservations: CachedObservationModel[]): CreateObservationModel[] {
    return cachedObservations.map((cachedObservation) => ({
      stationId: cachedObservation.stationId,
      elementId: cachedObservation.elementId,
      sourceId: cachedObservation.sourceId,
      level: cachedObservation.level,
      datetime: cachedObservation.datetime,
      interval: cachedObservation.interval,
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
  public bulkPutDataFromEntryForm(observations: CreateObservationModel[]): Observable<{ message: string }> { 
    return this.http.put<{ message: string }>(this.endPointUrl, observations).pipe(
      tap({
        next: (response: any) => {
          // Server will send {message: 'success'} when there is no error
          // Start synicing in unsynced data asynchronously
          if (response.message === 'success') this.syncObservations();
        },
        error: err => {
          // If there is network error then save observations as unsynchronised and no need to send data to server
          if (err.status === 0) {
            console.warn('saving unsynced data locally');
            this.saveDataToLocalDatabase(observations, 'false');
          }
        }
      }),
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

    console.log('totalUnsynced: ', totalUnsynced);

    // If there are no unsynced observations then set syncing flag to false and return
    if (totalUnsynced === 0) {
      // Clear all cached values once everything has been successfully synced
      await AppDatabase.instance.observations.clear();
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

  public bulkPutDataFromDataCorrection(observations: CreateObservationModel[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(this.endPointUrl, observations);
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


  public findStationsObservationStatus(query: StationStatusQueryModel): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.endPointUrl}/stations-observation-status`,
      { params: StringUtils.getQueryParams<StationStatusQueryModel>(query) }
    )
      .pipe(
        catchError(this.handleError)
      );
  }

  public findStationsObservationStatusData(stationId: string, query: StationStatusDataQueryModel): Observable<LastStationActivityObservation[]> {
    return this.http.get<LastStationActivityObservation[]>(
      `${this.endPointUrl}/stations-observation-status/${stationId}`,
      { params: StringUtils.getQueryParams<StationStatusQueryModel>(query) }
    )
      .pipe(
        catchError(this.handleError)
      );
  }

  public findDataAvailabilityStatus(query: DataAvailabilityQueryModel): Observable<DataAvailabilityStatusModel[]> {
    return this.http.get<DataAvailabilityStatusModel[]>(
      `${this.endPointUrl}/data-availability-status`,
      { params: StringUtils.getQueryParams<DataAvailabilityQueryModel>(query) }
    )
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
