import { BehaviorSubject, catchError, map, Observable, take, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { environment } from "src/environments/environment";
import { HttpClient, HttpErrorResponse } from "@angular/common/http"; 
import { ViewRegionModel } from "src/app/core/models/Regions/view-region.model";
import { CreateUpdateRegionModel } from "src/app/core/models/Regions/create-update-region.model";

@Injectable({
    providedIn: 'root'
})
export class RegionsCacheService {
    private endPointUrl: string = `${environment.apiUrl}/regions`;
    private readonly _cachedRegions: BehaviorSubject<ViewRegionModel[]> = new BehaviorSubject<ViewRegionModel[]>([]); 

    constructor(
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.loadRegions();
        //this.checkForUpdates();
    }

    private async loadRegions() {
        this._cachedRegions.next(await AppDatabase.instance.regions.toArray());
    }

    private checkForUpdates(): void {
        this.metadataUpdatesService.checkUpdates('regions').pipe(
            take(1)
        ).subscribe(res => {
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

    public deleteAll(): Observable<number> {
        return this.http.delete<number>(`${this.endPointUrl}/delete-all`)
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