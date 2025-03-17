import { BehaviorSubject, catchError, map, Observable, Subscription, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { CreateUpdateRegionModel } from "src/app/metadata/regions/models/create-update-region.model";
import { AppConfigService } from "src/app/app-config.service";
import { ViewOrganisationModel } from "../models/view-organisation.model";
import { CreateUpdateOrganisationModel } from "../models/create-update-organisation.model";

@Injectable({
    providedIn: 'root'
})
export class OrganisationsCacheService {
    private endPointUrl: string;
    private readonly _cachedOrganisation: BehaviorSubject<ViewOrganisationModel[]> = new BehaviorSubject<ViewOrganisationModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/organisations`;
        this.loadOrganisation();
    }

    private async loadOrganisation() {
        this._cachedOrganisation.next(await AppDatabase.instance.organisations.toArray());
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
        return this._cachedOrganisation.asObservable();
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
                catchError(this.handleError)
            );
    }

    public update(id: number, updateDto: CreateUpdateRegionModel): Observable<ViewOrganisationModel> {
        return this.http.patch<ViewOrganisationModel>(`${this.endPointUrl}/${id}`, updateDto)
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