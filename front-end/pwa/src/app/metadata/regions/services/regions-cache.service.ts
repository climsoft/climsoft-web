import { BehaviorSubject, catchError, map, Observable, Subscription, take, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ViewRegionModel } from "src/app/metadata/regions/models/view-region.model";
import { CreateUpdateRegionModel } from "src/app/metadata/regions/models/create-update-region.model";
import { AppConfigService } from "src/app/app-config.service";

@Injectable({
    providedIn: 'root'
})
export class RegionsCacheService {
    private endPointUrl: string;
    private readonly _cachedRegions: BehaviorSubject<ViewRegionModel[]> = new BehaviorSubject<ViewRegionModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/regions`;
        this.loadRegions();
    }

    private async loadRegions() {
        this._cachedRegions.next(await AppDatabase.instance.regions.toArray());
    }

    public checkForUpdates(): void {
        console.log('checking regions updates');
        this.checkUpdatesSubscription.unsubscribe();
        this.checkUpdatesSubscription = this.metadataUpdatesService.checkUpdates('regions').subscribe(res => {
            console.log('regions-cache response', res);
            if (res) {
                this.loadRegions();
            }
        });
    }

    public get cachedRegions(): Observable<ViewRegionModel[]> {
        this.checkForUpdates();
        return this._cachedRegions.asObservable();
    }

    public findOne(id: number): Observable<ViewRegionModel | undefined> {
        return this.cachedRegions.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public create(createDto: CreateUpdateRegionModel): Observable<ViewRegionModel> {
        return this.http.post<ViewRegionModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public update(id: number, updateDto: CreateUpdateRegionModel): Observable<ViewRegionModel> {
        return this.http.patch<ViewRegionModel>(`${this.endPointUrl}/${id}`, updateDto)
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