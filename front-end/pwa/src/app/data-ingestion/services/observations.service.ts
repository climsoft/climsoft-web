
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, from, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, take, tap } from 'rxjs/operators';
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
import { DataAvailabilitySummaryQueryModel } from '../models/data-availability-summary.model';
import { DataFlowQueryModel } from '../models/data-flow-query.model';
import { QCStatusEnum } from '../models/qc-status.enum';
import { AppAuthInterceptor } from 'src/app/app-auth.interceptor';

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
        catchError(AppAuthInterceptor.handleError)
      );
  }

  // There should always be a limit requirement for performance reasons
  public count(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(
      `${this.endPointUrl}/count`,
      { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  private findCorrectionData(viewObsQuery: ViewObservationQueryModel): Observable<ViewObservationModel[]> {
    return this.http.get<ViewObservationModel[]>(`${this.endPointUrl}/correction-data`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  private countCorrectionData(viewObsQuery: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count-correction-data`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(viewObsQuery) })
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
  }

  private findObsLog(observationQuery: ViewObservationLogQueryModel): Observable<ViewObservationLogModel[]> {
    return this.http.get<ViewObservationLogModel[]>(
      `${this.endPointUrl}/log`,
      { params: StringUtils.getQueryParams<ViewObservationLogQueryModel>(observationQuery) })
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

    return this.convertToViewObservationModels(cachedObservations);
  }

  private convertToViewObservationModels(cachedObservations: CachedObservationModel[]): ViewObservationModel[] {
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
        next: (response: any) => {
          // Server will send {message: 'success'} when there is no error
          // Start syncing in unsynced data asynchronously
          // Note, the form will not display data that is being synced until it gets saved in the server
          // Users should be aware that they will have to wait for the syncing to finish. 
          // So navigating away from the form then back will display the data
          if (response.message === 'success') this.syncObservations();
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
    const cachedObservations: CachedObservationModel[] = await AppDatabase.instance.observations
      .where('synced').equals('false').limit(1000).toArray();
    const observations: CreateObservationModel[] = this.convertToViewObservationModels(cachedObservations);
    this.http.put<{ message: string }>(`${this.endPointUrl}/data-entry`, observations).pipe(
      take(1),
      catchError(err => {
        this.isSyncing = false;
        // TODO. Left here.
        
        // This should check for not found hour and simply delete only the observations without the hour
        // from the local database. So the server error of hour not allowed should also 
        // Include the hour that was found to have problems.

        // TODO. Notify network errors
        return AppAuthInterceptor.handleError(err);
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
    return this.http.delete<number>(`${this.endPointUrl}/soft`, { body: observations })
      .pipe(
        catchError(AppAuthInterceptor.handleError)
      );
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

  public findDataAvailabilitySummary(query: DataAvailabilityQueryModel): Observable<DataAvailabilitySummaryQueryModel[]> {
    return this.http.get<DataAvailabilitySummaryQueryModel[]>(
      `${this.endPointUrl}/data-availability-summary`,
      { params: StringUtils.getQueryParams<DataAvailabilityQueryModel>(query) }
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




}
