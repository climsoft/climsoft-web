import { StringUtils } from "src/app/shared/utils/string.utils";
import { BehaviorSubject, concatMap, map, Observable, of, Subscription, tap } from "rxjs";
import { Injectable } from "@angular/core";
import { AppDatabase } from "src/app/app-database";
import { HttpClient } from "@angular/common/http";
import { AppConfigService } from "src/app/app-config.service";
import { CreateStationModel } from "../models/create-station.model";
import { ViewOrganisationModel } from "../../organisations/models/view-organisation.model";
import { StationProcessingMethodEnum } from "../models/station-processing-method.enum";
import { StationStatusEnum } from "../models/station-status.enum";
import { ViewStationObsEnvModel } from "../models/view-station-obs-env.model";
import { ViewStationObsFocusModel } from "../models/view-station-obs-focus.model";
import { UpdateStationModel } from "../models/update-station.model";
import { MetadataUpdatesService } from "../../metadata-updates/metadata-updates.service";

export interface StationCacheModel {
    id: string;
    name: string;
    description: string;
    location: {
        longitude: number;
        latitude: number;
    } | null,
    elevation: number | null;
    stationObsProcessingMethod: StationProcessingMethodEnum | null;
    stationObsProcessingMethodName: string;
    stationObsEnvironmentId: number;
    stationObsEnvironmentName: string;
    stationObsFocusId: number;
    stationObsFocusName: string;
    ownerId: number;
    ownerName: string;
    operatorId: number;
    operatorName: string;
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
    private endPointUrl: string;
    private readonly _cachedStations: BehaviorSubject<StationCacheModel[]> = new BehaviorSubject<StationCacheModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription(); // Deprecate this
    private checkingForUpdates: boolean = false;

    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/stations`;
        this.loadStations();
    }

    private async loadStations() {
        const obsEnvs: ViewStationObsEnvModel[] = await this.getStationObsEnv();
        const obsFocuses: ViewStationObsFocusModel[] = await this.getStationObsFocus();
        const organisations: ViewOrganisationModel[] = await AppDatabase.instance.organisations.toArray();
        const newCachedStations: StationCacheModel[] = [];

        //console.log('fetching stations from local db and putting into memory');

        const localDBStations: CreateStationModel[] = await AppDatabase.instance.stations.toArray();
        for (const station of localDBStations) {
            const obsEnv = obsEnvs.find(item => item.id === station.stationObsEnvironmentId);
            const obsFocus = obsFocuses.find(item => item.id === station.stationObsFocusId);
            const owner = organisations.find(item => item.id === station.ownerId);
            const operator = organisations.find(item => item.id === station.operatorId);
            const location = station.longitude && station.latitude ? { longitude: station.longitude, latitude: station.latitude } : null;

            newCachedStations.push(
                {
                    id: station.id,
                    name: station.name,
                    description: station.description || '',
                    location: location,
                    elevation: station.elevation || null,
                    stationObsProcessingMethod: station.stationObsProcessingMethod || null,
                    stationObsProcessingMethodName: station.stationObsProcessingMethod ? StringUtils.formatEnumForDisplay(station.stationObsProcessingMethod) : '',
                    stationObsEnvironmentId: obsEnv?.id || 0,
                    stationObsEnvironmentName: obsEnv?.name || '',
                    stationObsFocusId: obsFocus?.id || 0,
                    stationObsFocusName: obsFocus?.name || '',
                    ownerId: owner?.id || 0,
                    ownerName: owner?.name || '',
                    operatorId: operator?.id || 0,
                    operatorName: owner?.name || '',
                    wmoId: station.wmoId ? station.wmoId : '',
                    wigosId: station.wigosId ? station.wigosId : '',
                    icaoId: station?.icaoId || '',
                    status: station?.status || null,
                    statusName: station.status ? StringUtils.formatEnumForDisplay(station.status) : '',
                    dateEstablished: station.dateEstablished?.substring(0, 10) || '',
                    dateClosed: station.dateClosed?.substring(0, 10) || '',
                    comment: station.comment || '',
                });
        }
        this._cachedStations.next(newCachedStations);
    }


    public checkForUpdates(): void {
        // If still checking for updates just return
        if (this.checkingForUpdates) return;

        console.log('checking stations updates');
        // Observable to initiate metadata updates sequentially
        this.checkingForUpdates = true;
        this.checkUpdatesSubscription.unsubscribe();
        this.checkUpdatesSubscription = of(null).pipe(
            concatMap(() => this.metadataUpdatesService.checkUpdates('organisations')),
            concatMap(() => this.metadataUpdatesService.checkUpdates('stationObsEnv')),
            concatMap(() => this.metadataUpdatesService.checkUpdates('stationObsFocus')),
            concatMap(() => this.metadataUpdatesService.checkUpdates('stations')),
        ).subscribe({
            next: res => {
                console.log('stations-cache response', res);
                this.checkingForUpdates = false;
                if (res) {
                    this.loadStations();
                }
            },
            error: err => {
                this.checkingForUpdates = false;
            }
        } );
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

    public bulkPut(items: CreateStationModel[]): Observable<void> {
        return this.http.put<void>(`${this.endPointUrl}/bulk`, items)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public create(createDto: CreateStationModel): Observable<CreateStationModel> {
        return this.http.post<CreateStationModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public update(id: string, updateDto: UpdateStationModel): Observable<CreateStationModel> {
        return this.http.patch<CreateStationModel>(`${this.endPointUrl}/${id}`, updateDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public delete(id: string): Observable<string> {
        return this.http.delete<string>(`${this.endPointUrl}/${id}`)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public deleteAll(): Observable<boolean> {
        return this.http.delete<boolean>(`${this.endPointUrl}`)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public get downloadLink(): string {
        return `${this.endPointUrl}/download`;
    }

}