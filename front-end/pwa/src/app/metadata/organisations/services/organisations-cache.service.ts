import { BehaviorSubject, map, Observable, Subscription, tap } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient } from "@angular/common/http"; 
import { AppConfigService } from "src/app/app-config.service";
import { ViewOrganisationModel } from "../models/view-organisation.model";
import { CreateUpdateOrganisationModel } from "../models/create-update-organisation.model";

@Injectable({
    providedIn: 'root'
})
export class OrganisationsCacheService {
    private endPointUrl: string;
    private readonly _cachedOrganisations: BehaviorSubject<ViewOrganisationModel[]> = new BehaviorSubject<ViewOrganisationModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/organisations`;
        this.loadOrganisation();
    }

    private async loadOrganisation() {
        this._cachedOrganisations.next(await AppDatabase.instance.organisations.toArray());
    }

    public checkForUpdates(): void {
        console.log('checking organisations updates');
        this.checkUpdatesSubscription.unsubscribe();
        this.checkUpdatesSubscription = this.metadataUpdatesService.checkUpdates('organisations').subscribe(res => {
            console.log('organisations-cache response', res);
            if (res) {
                this.loadOrganisation();
            }
        });
    }

    public get cachedOrganisations(): Observable<ViewOrganisationModel[]> {
        this.checkForUpdates();
        return this._cachedOrganisations.asObservable();
    }

    public findOne(id: number): Observable<ViewOrganisationModel | undefined> {
        return this.cachedOrganisations.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public create(createDto: CreateUpdateOrganisationModel): Observable<ViewOrganisationModel> {
        return this.http.post<ViewOrganisationModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public update(id: number, updateDto: CreateUpdateOrganisationModel): Observable<ViewOrganisationModel> {
        return this.http.patch<ViewOrganisationModel>(`${this.endPointUrl}/${id}`, updateDto)
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