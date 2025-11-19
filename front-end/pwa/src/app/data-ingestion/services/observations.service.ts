
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, from, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, take, tap } from 'rxjs/operators';
import { ViewObservationQueryModel } from '../models/view-observation-query.model';
import { ViewObservationModel } from '../models/view-observation.model';
import { CreateObservationModel } from '../models/create-observation.model';
import { EntryFormObservationQueryModel } from '../models/entry-form-observation-query.model';
import { DeleteObservationModel } from '../models/delete-observation.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { AppConfigService } from 'src/app/app-config.service';
import { AppDatabase } from 'src/app/app-database';
import { LastStationActivityObservation } from '../models/last-station-activity-observation.model';
import { StationStatusQueryModel } from 'src/app/data-monitoring/station-status/models/station-status-query.model';
import { StationStatusDataQueryModel } from 'src/app/data-monitoring/station-status/models/station-status-data-query.model';
import { DataAvailabilitySummaryQueryModel } from 'src/app/data-monitoring/data-availability/models/data-availability-summary-query.model';
import { DataAvailabilitySummaryModel } from '../models/data-availability-summary.model';
import { DataFlowQueryModel } from '../models/data-flow-query.model';
import { QCStatusEnum } from '../models/qc-status.enum';
import { AppAuthInterceptor } from 'src/app/app-auth.interceptor';
import { DataAvailabilityDetailsQueryModel } from 'src/app/data-monitoring/data-availability/models/data-availability-details-query.model';
import { DataAvailaibilityDetailsModel } from 'src/app/data-monitoring/data-availability/models/data-availability-details.model';

export interface CachedObservationModel extends CreateObservationModel {
  synced: 'true' | 'false'; // booleans are not indexable in indexdb and DexieJs so use 'true'|'false' for readabilty and semantics
  entryDatetime: Date; // Note. This represents the Date that record was added into the local database
  serverErrorMessage: string;
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
        catchError(AppAuthInterceptor.handleError)
      );
  }

  /**
   * This implementation checks the server first then the local database. 
   * It takes time to fetch data when user is offline
   * @param entryFormObsQuery 
   * @returns 
   */
  public findEntryFormData(entryFormObsQuery: EntryFormObservationQueryModel): Observable<ViewObservationModel[]> {
    return this.http.get<ViewObservationModel[]>(`${this.endPointUrl}/form-data`, { params: StringUtils.getQueryParams<EntryFormObservationQueryModel>(entryFormObsQuery) })
      .pipe(
        switchMap(observations => {
          if (observations.length > 0) {
            // Delete any of the received data in the local database.
            // Note, this will only delete observations that are from the server
            this.deleteDataFromLocalDatabase(observations);
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
          if (AppAuthInterceptor.isKnownNetworkError(err)) {
            // For network errors. Always attempt fetching data locally
            console.warn('Network error detected. Fetching data locally.');
            return from(this.fetchObservationsLocally(entryFormObsQuery));
          } else {
            // For other errors handle them normally 
            return AppAuthInterceptor.handleError(err);
          }

        })
      );
  }

  private async fetchObservationsLocally(entryFormObsQuery: EntryFormObservationQueryModel): Promise<ViewObservationModel[]> {
    // Use Compound index [stationId+sourceId+level+elementId+datetime]
    const filters: [string, number, number, number, string][] = [];
    const toDate = new Date(entryFormObsQuery.toDate);
    const datetimes: string[] = []
    for (let dt = new Date(entryFormObsQuery.fromDate); dt <= toDate; dt.setHours(dt.getHours() + 1)) {
      datetimes.push(dt.toISOString());
    }

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

    return cachedObservations.map(cachedObservation => ({
      stationId: cachedObservation.stationId,
      elementId: cachedObservation.elementId,
      sourceId: cachedObservation.sourceId,
      level: cachedObservation.level,
      datetime: cachedObservation.datetime,
      interval: cachedObservation.interval,
      value: cachedObservation.value,
      flag: cachedObservation.flag,
      comment: cachedObservation.comment,
      qcStatus: QCStatusEnum.NONE,
      qcTestLog: null,
      log: null,
      entryDatetime: '',
    }));
  }

  /**
   * Used by data entry forms to send data to server
   * @param observations 
   * @returns 
   */
  public bulkPutDataFromEntryForm(observations: CreateObservationModel[]): Observable<{ message: string }> {

    return this.http.put<{ message: string }>(`${this.endPointUrl}/data-entry`, observations).pipe(
      tap({
        next: () => {
          // Start syncing in unsynced data asynchronously
          // Note, the form will not display data that is being synced until it gets saved in the server
          // Users should be aware that they will have to wait for the syncing to finish. 
          // So navigating away from the form then back will display the data
          // Always attempt to delete any cached data, this is very useful if previous value was cached due to network issues
          this.deleteDataFromLocalDatabase(observations);
          // then attempt syncing of any local data.
          this.syncObservations();
        },
        error: err => {
          // If there is network error then save observations as unsynchronised and no need to send data to server
          if (AppAuthInterceptor.isKnownNetworkError(err)) {
            console.warn('saving unsynced data locally');
            this.saveDataToLocalDatabase(observations, 'false');
          }
        }
      }),
    );
  }


  public async syncObservations() {
    // If sync process is still on going then just return
    if (this.isSyncing) {
      return;
    }

    // Get total number of unsynced observations
    const totalUnsynced: number = await this.countUnsyncedObservationsAndRaiseNotification();

    //console.log('totalUnsynced: ', totalUnsynced);

    // If there are no unsynced observations then set syncing flag to false and return
    if (totalUnsynced === 0) {
      // Clear all cached values once everything has been successfully synced
      await AppDatabase.instance.observations.clear();
      this.isSyncing = false;
      return;
    }

    // Else send the unsynced data to server in batches of 1000
    this.isSyncing = true;
    const cachedObservations: CachedObservationModel[] = await AppDatabase.instance.observations.where('synced').equals('false').limit(1000).toArray();
    const observations: CreateObservationModel[] = cachedObservations.map(cachedObservation => ({
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

    this.http.put<{ message: string }>(`${this.endPointUrl}/data-entry`, observations).pipe(
      take(1),
      catchError(err => {
        this.isSyncing = false;

        // If its a bad request with a returned dto
        if (err.status === 400) {

          if (err.error.dto) {
            // If the error relates to dto then update the dto with the server error message. 
            // Form parameters may have been changed and this makes the data stale
            console.warn('unsucessful syncing of data: ', err.error.message, err.error.dto);
            const obsWithError: CreateObservationModel = err.error.dto;
            this.saveDataToLocalDatabase([obsWithError], 'false', err.error.message);
          }
          // TODO. Show a sync icon error
          return throwError(() => new Error(`A locally saved data could not be saved by the server`));
        } else {
          return AppAuthInterceptor.handleError(err);
        }
      }),
    ).subscribe(response => {
      // Server will send {message: success} when there is no error
      console.log('server response after sync: ', response, 'saving synced data locally');
      // set syncing flag to false to keep syncing    
      this.isSyncing = false;
      if (response.message === 'success') {
        // save observations as synchronised 
        this.saveDataToLocalDatabase(observations, 'true');
        // Then synchronise remaining observations
        this.syncObservations();
      }
    });

  }


  /**
 * Saves observations to the local database and counts the number of unsynced observations
 * @param observations 
 * @param synced 
 */
  private async saveDataToLocalDatabase(observations: CreateObservationModel[], synced: 'true' | 'false', serverErrorMessage: string = '') {
    await AppDatabase.instance.observations.bulkPut(observations.map(item => {
      return {
        ...item,
        synced: synced,
        entryDatetime: new Date(),
        serverErrorMessage: serverErrorMessage,
      }
    }));
    this.countUnsyncedObservationsAndRaiseNotification();
  }

  private async deleteDataFromLocalDatabase(observations: CreateObservationModel[]) {
    //Key is [stationId+elementId+level+datetime+interval+sourceId]
    const observationKeys: [string, number, number, string, number, number][] = observations.map(obs => {
      return [
        obs.stationId,
        obs.elementId,
        obs.level,
        obs.datetime,
        obs.interval,
        obs.sourceId,];
    });
    await AppDatabase.instance.observations.bulkDelete(observationKeys);
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

  // TODO. There should always be a limit requirement for performance reasons
  public count(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(
      `${this.endPointUrl}/count`,
      { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public bulkPutDataFromDataCorrection(observations: CreateObservationModel[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.endPointUrl}/data-entry`, observations);
  }

  public bulkPutDataFromQCAssessment(observations: CreateObservationModel[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.endPointUrl}/data-entry-qc`, observations);
  }

  public restore(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.patch<number>(`${this.endPointUrl}/restore`, observations)
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public softDelete(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.delete<number>(`${this.endPointUrl}/soft`, { body: observations });
  }

  public hardDelete(observations: DeleteObservationModel[]): Observable<number> {
    return this.http.delete<number>(`${this.endPointUrl}/hard`, { body: observations })
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public findStationsObservationStatus(query: StationStatusQueryModel): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.endPointUrl}/stations-observation-status`,
      { params: StringUtils.getQueryParams<StationStatusQueryModel>(query) }
    )
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public findStationsObservationStatusData(stationId: string, query: StationStatusDataQueryModel): Observable<LastStationActivityObservation[]> {
    return this.http.get<LastStationActivityObservation[]>(
      `${this.endPointUrl}/stations-observation-status/${stationId}`,
      { params: StringUtils.getQueryParams<StationStatusQueryModel>(query) }
    )
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public findDataAvailabilitySummary(query: DataAvailabilitySummaryQueryModel): Observable<DataAvailabilitySummaryModel[]> {
    return this.http.get<DataAvailabilitySummaryModel[]>(
      `${this.endPointUrl}/data-availability-summary`,
      { params: StringUtils.getQueryParams<DataAvailabilitySummaryQueryModel>(query) }
    )
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public findDataAvailabilityDetails(query: DataAvailabilityDetailsQueryModel): Observable<DataAvailaibilityDetailsModel[]> {
    return this.http.get<DataAvailaibilityDetailsModel[]>(
      `${this.endPointUrl}/data-availability-details`,
      { params: StringUtils.getQueryParams<DataAvailabilityDetailsQueryModel>(query) }
    )
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public findDataFlow(query: DataFlowQueryModel): Observable<ViewObservationModel[]> {
    return this.http.get<ViewObservationModel[]>(
      `${this.endPointUrl}/data-flow`,
      { params: StringUtils.getQueryParams<DataFlowQueryModel>(query) }
    )
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }


  public countObsNotSavedToV4(): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count-v4-unsaved-observations`)
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public generateExport(exportTemplateId: number, viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(
      `${this.endPointUrl}/generate-export/${exportTemplateId}`,
      { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  public getDownloadExportLink(exportTemplateId: number): string {
    return `${this.endPointUrl}/download-export/${exportTemplateId}`;
  }

}
