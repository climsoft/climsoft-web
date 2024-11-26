import { ViewStationModel } from "../../../core/models/stations/view-station.model";
import { LocalStorageService } from "src/app/metadata/local-storage.service";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { BehaviorSubject, catchError, map, Observable, take, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { ViewStationObsEnvModel } from "src/app/core/models/stations/view-station-obs-env.model";
import { ViewStationObsFocusModel } from "src/app/core/models/stations/view-station-obs-focus.model";
import { StationObsProcessingMethodEnum } from "src/app/core/models/stations/station-obs-Processing-method.enum";
import { environment } from "src/environments/environment";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { UpdateStationModel } from "src/app/core/models/stations/update-station.model";
import { CreateStationModel } from "src/app/core/models/stations/create-station.model";
import { StationStatusEnum } from "src/app/core/models/stations/station-status.enum";

export interface StationCacheModel {
    id: string;
    name: string;
    description: string;
    // longitude: number | string;
    // latitude: number | string;
    location: {
        longitude: number;
        latitude: number;
    } | null,
    elevation: number | null;
    stationObsProcessingMethod: StationObsProcessingMethodEnum;
    stationObsProcessingMethodName: string;
    stationObsEnvironmentId: number;
    stationObsEnvironmentName: string;
    stationObsFocusId: number;
    stationObsFocusName: string;
    wmoId: string;
    wigosId: string;
    icaoId: string;
    status: StationStatusEnum | null;
    statusName: string;
    dateEstablished: string;
    dateClosed: string;
    comment: string;
}

@Injectable({
    providedIn: 'root'
})
export class StationsCacheService {
    private endPointUrl: string = `${environment.apiUrl}/stations`;
    private readonly _cachedStations: BehaviorSubject<StationCacheModel[]> = new BehaviorSubject<StationCacheModel[]>([]);
    private readonly stationsChanged: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.loadStations();
        this.checkForUpdates();
        this.stationsChanged.subscribe(item => {
            if (item) {
                this.loadStations();
                this.stationsChanged.next(false);
            }
        });
    }

    private async loadStations() {
        const obsEnvs: ViewStationObsEnvModel[] = await this.getStationObsEnv();
        const obsFocuses: ViewStationObsFocusModel[] = await this.getStationObsFocus();
        const newCachedStations: StationCacheModel[] = [];

        await AppDatabase.instance.stations.each(station => {
            const obsEnv = obsEnvs.find(item => item.id === station.stationObsEnvironmentId);
            const obsFocus = obsFocuses.find(item => item.id === station.stationObsFocusId);
            const location = station.longitude && station.latitude ? { longitude: station.longitude, latitude: station.latitude } : null;

            newCachedStations.push(
                {
                    id: station.id,
                    name: station.name,
                    description: station.description,
                    //longitude: station.longitude,
                    //latitude: station.latitude,
                    location: location,
                    elevation: station.elevation,
                    stationObsProcessingMethod: station.stationObsProcessingMethod,
                    stationObsProcessingMethodName: StringUtils.formatEnumForDisplay(station.stationObsProcessingMethod),
                    stationObsEnvironmentId: obsEnv ? obsEnv.id : 0,
                    stationObsEnvironmentName: obsEnv ? obsEnv.name : '',
                    stationObsFocusId: obsFocus ? obsFocus.id : 0,
                    stationObsFocusName: obsFocus ? obsFocus.name : '',
                    wmoId: station.wmoId ? station.wmoId : '',
                    wigosId: station.wigosId ? station.wigosId : '',
                    icaoId: station.icaoId ? station.icaoId : '',
                    status: station.status,
                    statusName: station.status ? StringUtils.formatEnumForDisplay(station.status) : '',
                    dateEstablished: station.dateEstablished ? station.dateEstablished.substring(0, 10) : '',
                    dateClosed: station.dateClosed ? station.dateClosed.substring(0, 10) : '',
                    comment: station.comment ? station.comment : '',
                }
            );
        });

        this._cachedStations.next(newCachedStations);
    }

    private checkForUpdates(): void {
        this.stationsChanged.next(false);
        this.metadataUpdatesService.checkUpdates('stationObsEnv', this.stationsChanged);
        this.metadataUpdatesService.checkUpdates('stationObsFocus', this.stationsChanged);
        this.metadataUpdatesService.checkUpdates('stations', this.stationsChanged);
    }

    public get cachedStations(): Observable<StationCacheModel[]> {
        this.checkForUpdates();
        return this._cachedStations.asObservable();
    }

    public async getStationObsEnv(): Promise<ViewStationObsEnvModel[]> {
        return await AppDatabase.instance.stationObsEnv.toArray();
    }

    public async getStationObsFocus(): Promise<ViewStationObsFocusModel[]> {
        return await AppDatabase.instance.stationObsFocus.toArray();
    }

    public findOne(id: string): Observable<StationCacheModel | undefined> {
        return this.cachedStations.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public create(createDto: CreateStationModel): Observable<CreateStationModel> {
        return this.http.post<CreateStationModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public update(id: string, updateDto: UpdateStationModel): Observable<CreateStationModel> {
        return this.http.patch<CreateStationModel>(`${this.endPointUrl}/${id}`, updateDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public delete(id: string): Observable<string> {
        return this.http.delete<string>(`${this.endPointUrl}/${id}`)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public get downloadLink(): string {
        return `${this.endPointUrl}/download`;
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