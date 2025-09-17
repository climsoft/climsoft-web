import { BehaviorSubject, map, Observable, Subscription, tap } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient } from "@angular/common/http";
import { AppConfigService } from "src/app/app-config.service";
import { ViewNetworkAffiliationModel } from "../models/view-network-affiliation.model";
import { CreateUpdateNetworkAffiliationModel } from "../models/create-update-network-affiliation.model";

export interface NetworkAffiliationCacheModel {
    id: number;
    name: string;
    description: string;
    parentNetworkId: number;
    parentNetworkName: string;
    extraMetadata: string;
    comment: string;
}

@Injectable({
    providedIn: 'root'
})
export class NetworkAffiliationsCacheService {
    private endPointUrl: string;
    private readonly _cachedNetworkAffiliations: BehaviorSubject<NetworkAffiliationCacheModel[]> = new BehaviorSubject<NetworkAffiliationCacheModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/network-affiliations`;
        this.loadNetworkAffiliations();
    }

    private async loadNetworkAffiliations() {
        const networksFromServer: ViewNetworkAffiliationModel[] = await AppDatabase.instance.networkAffiliations.toArray();
        const newCachedNetworks: NetworkAffiliationCacheModel[] = [];
        for (const network of networksFromServer) {
            let parentNetworkName = '';
            if (network.parentNetworkId) {
                const networkFromServer = networksFromServer.find(item => item.id === network.parentNetworkId);
                if (networkFromServer) parentNetworkName = networkFromServer.name;
            }

            newCachedNetworks.push({
                id: network.id,
                name: network.name,
                description: network.description ? network.description : '',
                parentNetworkId: network.parentNetworkId ? network.parentNetworkId : 0,
                parentNetworkName: parentNetworkName,
                extraMetadata: network.extraMetadata ? network.extraMetadata : '',
                comment: network.comment ? network.comment : '',
            });
        }

        this._cachedNetworkAffiliations.next(newCachedNetworks);
    }

    public checkForUpdates(): void {
        console.log('checking network-affiliations updates');
        this.checkUpdatesSubscription.unsubscribe();
        this.checkUpdatesSubscription = this.metadataUpdatesService.checkUpdates('networkAffiliations').subscribe(res => {
            console.log('network-affiliations-cache response', res);
            if (res) {
                this.loadNetworkAffiliations();
            }
        });
    }

    public get cachedNetworkAffiliations(): Observable<NetworkAffiliationCacheModel[]> {
        this.checkForUpdates();
        return this._cachedNetworkAffiliations.asObservable();
    }

    public findOne(id: number): Observable<ViewNetworkAffiliationModel | undefined> {
        return this.cachedNetworkAffiliations.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public create(createDto: CreateUpdateNetworkAffiliationModel): Observable<ViewNetworkAffiliationModel> {
        return this.http.post<ViewNetworkAffiliationModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public update(id: number, updateDto: CreateUpdateNetworkAffiliationModel): Observable<ViewNetworkAffiliationModel> {
        return this.http.patch<ViewNetworkAffiliationModel>(`${this.endPointUrl}/${id}`, updateDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public delete(id: number): Observable<number> {
        return this.http.delete<number>(`${this.endPointUrl}/${id}`)
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
}