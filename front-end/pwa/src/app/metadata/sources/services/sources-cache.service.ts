import { BehaviorSubject, catchError, map, Observable, take, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { environment } from "src/environments/environment";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ViewSourceModel } from "../models/view-source.model";
import { CreateUpdateSourceModel } from "../models/create-update-source.model";

@Injectable({
    providedIn: 'root'
})
export class SourcesCacheService {
    private endPointUrl: string = `${environment.apiUrl}/sources`;
    private readonly _cachedSources: BehaviorSubject<ViewSourceModel[]> = new BehaviorSubject<ViewSourceModel[]>([]); 

    constructor(
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.loadSources();
        this.checkForUpdates();
    }

    private async loadSources() {
        this._cachedSources.next(await AppDatabase.instance.sources.toArray());
    }

    private checkForUpdates(): void {
        this.metadataUpdatesService.checkUpdates('sources').pipe(
            take(1)
        ).subscribe(reset => {
            if (reset) {
                this.loadSources();
            }
        });
    }

    public get cachedStations(): Observable<ViewSourceModel[]> {
        this.checkForUpdates();
        return this._cachedSources.asObservable();
    }

    public findOne(id: number): Observable<ViewSourceModel | undefined> {
        return this.cachedStations.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public create(createDto: CreateUpdateSourceModel): Observable<ViewSourceModel> {
        return this.http.post<ViewSourceModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public update(id: number, updateDto: CreateUpdateSourceModel): Observable<ViewSourceModel> {
        return this.http.patch<ViewSourceModel>(`${this.endPointUrl}/${id}`, updateDto)
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