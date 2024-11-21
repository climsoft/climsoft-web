import { ViewStationModel } from "../../../core/models/stations/view-station.model";
import { LocalStorageService } from "src/app/metadata/local-storage.service";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { BehaviorSubject, Observable } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { ViewStationObsEnvModel } from "src/app/core/models/stations/view-station-obs-env.model";
import { ViewStationObsFocusModel } from "src/app/core/models/stations/view-station-obs-focus.model";

export interface StationCacheModel {
    id: string;
    name: string;
    description: string;
    longitude: number | string;
    latitude: number | string;
    elevation: number;
    stationObsProcessingMethod: string;
    stationObsEnvironmentName: string;
    stationObsFocusName: string;
    wmoId: string;
    wigosId: string;
    icaoId: string;
    status: string;
    dateEstablished: string;
    dateClosed: string;
    comment: string;
}

@Injectable({
    providedIn: 'root'
})
export class StationsCacheService {
    private readonly _cachedStations: BehaviorSubject<StationCacheModel[]> = new BehaviorSubject<StationCacheModel[]>([]);
    private readonly stationsChanged: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(private metadataUpdatesService: MetadataUpdatesService) {
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

            newCachedStations.push(
                {
                    id: station.id,
                    name: station.name,
                    description: station.description,
                    longitude: station.longitude,
                    latitude: station.latitude,
                    elevation: station.elevation,
                    stationObsProcessingMethod: StringUtils.formatEnumForDisplay(station.stationObsProcessingMethod),
                    stationObsEnvironmentName: obsEnv ? obsEnv.name : '',
                    stationObsFocusName: obsFocus ? obsFocus.name : '',
                    wmoId: station.wmoId ? station.wmoId : '',
                    wigosId: station.wigosId ? station.wigosId : '',
                    icaoId: station.icaoId ? station.icaoId : '',
                    status: StringUtils.formatEnumForDisplay(station.status),
                    dateEstablished: station.dateEstablished ? station.dateEstablished : '',
                    dateClosed: station.dateClosed ? station.dateClosed : '',
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


}