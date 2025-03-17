import { BehaviorSubject, catchError, map, Observable, Subscription, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient, HttpErrorResponse } from "@angular/common/http"; 
import { AppConfigService } from "src/app/app-config.service"; 
import { ViewNetworkAffiliatioModel } from "../models/view-network-affiliation.model";
import { CreateUpdateNetworkAffiliationModel } from "../models/create-update-network-affiliation.model";

@Injectable({
    providedIn: 'root'
})
export class NetworkAffiliationsCacheService {
    private endPointUrl: string;
    private readonly _cachedNetworkAffiliations: BehaviorSubject<ViewNetworkAffiliatioModel[]> = new BehaviorSubject<ViewNetworkAffiliatioModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/network-affiliations`;
        this.loadNetworkAffiliations();
    }

    private async loadNetworkAffiliations() {
        this._cachedNetworkAffiliations.next(await AppDatabase.instance.networkAffiliations.toArray());
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

    public get cachedNetworkAffiliations(): Observable<ViewNetworkAffiliatioModel[]> {
        this.checkForUpdates();
        return this._cachedNetworkAffiliations.asObservable();
    }

    public findOne(id: number): Observable<ViewNetworkAffiliatioModel | undefined> {
        return this.cachedNetworkAffiliations.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public create(createDto: CreateUpdateNetworkAffiliationModel): Observable<ViewNetworkAffiliatioModel> {
        return this.http.post<ViewNetworkAffiliatioModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public update(id: number, updateDto: CreateUpdateNetworkAffiliationModel): Observable<ViewNetworkAffiliatioModel> {
        return this.http.patch<ViewNetworkAffiliatioModel>(`${this.endPointUrl}/${id}`, updateDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public delete(id: number): Observable<number> {
        return this.http.delete<number>(`${this.endPointUrl}/${id}`)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public deleteAll(): Observable<boolean> {
        return this.http.delete<boolean>(`${this.endPointUrl}`)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
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