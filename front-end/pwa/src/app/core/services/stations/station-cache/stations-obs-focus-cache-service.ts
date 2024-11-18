import { HttpClient, HttpErrorResponse, HttpParams } from "@angular/common/http";
import { ViewStationModel } from "../../../models/stations/view-station.model";
import { LocalStorageService } from "src/app/metadata/local-storage.service";
import { environment } from "src/environments/environment";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { StationChangesModel } from "./station-changes.model";
import { BehaviorSubject, catchError, Observable, take, throwError } from "rxjs";
import { Injectable } from "@angular/core";

export interface StationCache {
    lastSyncedDate: string;
    stations: ViewStationModel[];
}

@Injectable({
    providedIn: 'root'
})
export class StationsCacheService {
    private readonly cachedStations: BehaviorSubject<ViewStationModel[]> = new BehaviorSubject<ViewStationModel[]>([]);
    private endPointUrl: string = `${environment.apiUrl}/stations`;
    private storageKey: string = "stations";
    private stationCache?: StationCache;

    constructor(
        private http: HttpClient,
        private localStorageService: LocalStorageService) {

        console.log("stations cache service constructed");

        // Get any saved stations cache if avaliable. Note this will be synchronous. So test.
        const savedCache = this.localStorageService.getItem<StationCache>(this.storageKey);
        if (savedCache) {
            console.log('saved cache', savedCache);

            this.stationCache = savedCache;
            this.cachedStations.next(this.stationCache.stations);
        }

        this.checkForUpdates();
    }

    public fetchLatest(): Observable<ViewStationModel[]> {
        this.checkForUpdates();
        return this.cachedStations.asObservable();
    }

    private checkForUpdates() {
        if (!this.stationCache) {
            console.log('after check for updates, cache does not exist, so resetting cache')
            this.resetCache();
            return;
        }

        console.log("updating stations cache");

        let httpParams: HttpParams = StringUtils.getQueryParams({ date: this.stationCache.lastSyncedDate });
        this.http.get<StationChangesModel>(`${this.endPointUrl}/updates`, { params: httpParams })
            .pipe(
                take(1),
                catchError(this.handleError)
            ).subscribe(data => {
                if (!data) {
                    return;
                }

                if (data.totalCount === this.cachedStations.value.length) {
                    if (data.updated && data.updated.length > 0) {
                        const combinedStations = this.getCombinedStations(this.cachedStations.value, data.updated);

                        console.log('setting combined cache after checking updates');

                        this.setCache(combinedStations);
                    }
                } else {
                    console.log('resetting cache after checking updates');
                    this.resetCache();
                }

            });
    }

    private resetCache(): void {
        this.http.get<ViewStationModel[]>(`${this.endPointUrl}`)
            .pipe(
                take(1),
                catchError(this.handleError)
            ).subscribe(data => {
                if (data) {
                    this.setCache(data);
                }
            });
    }

    private setCache(stations: ViewStationModel[]): void {
        this.stationCache = { lastSyncedDate: new Date().toISOString(), stations: stations };
        this.localStorageService.setItem<StationCache>(this.storageKey, this.stationCache);
        this.cachedStations.next(stations);
    }


    private getCombinedStations(oldStations: ViewStationModel[], updatedStations: ViewStationModel[]): ViewStationModel[] {
        const combinedStations: ViewStationModel[] = [...oldStations];
        for (let updatedStationIndex = 0; updatedStationIndex <= updatedStations.length - 1; updatedStationIndex++) {
            const oldStationIndex = combinedStations.findIndex(item => item.id === updatedStations[updatedStationIndex].id);
            if (oldStationIndex !== -1) {
                combinedStations.push(updatedStations[updatedStationIndex]);
            } else {
                combinedStations[oldStationIndex] = updatedStations[updatedStationIndex];
            }
        }

        return combinedStations;
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