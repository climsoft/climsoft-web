import { BehaviorSubject, catchError, map, Observable, Subscription, take, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ViewSourceModel } from "../models/view-source.model";
import { CreateUpdateSourceModel } from "../models/create-update-source.model";
import { AppConfigService } from "src/app/app-config.service";

@Injectable({
    providedIn: 'root'
})
export class SourceTemplatesCacheService {
    private endPointUrl: string;
    private readonly _cachedSources: BehaviorSubject<ViewSourceModel[]> = new BehaviorSubject<ViewSourceModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    private checkingForUpdates: boolean = false;

    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/source-templates`;
        this.loadSources();
    }

    private async loadSources() {
        this._cachedSources.next(await AppDatabase.instance.sourceTemplates.toArray());
    }

    private checkForUpdates(): void {
        // If still checking for updates just return
        if (this.checkingForUpdates) return;

        console.log('checking sources updates');
        this.checkingForUpdates = true;
        this.checkUpdatesSubscription.unsubscribe();
        this.checkUpdatesSubscription = this.metadataUpdatesService.checkUpdates('sourceTemplates').subscribe({
            next: res => {
                console.log('source-cache response', res);
                this.checkingForUpdates = false;
                if (res) {
                    this.loadSources();
                }
            },
            error: err => {
                this.checkingForUpdates = false;
            }
        });
    }

    public get cachedSources(): Observable<ViewSourceModel[]> {
        this.checkForUpdates();
        return this._cachedSources.asObservable();
    }

    public findOne(id: number): Observable<ViewSourceModel | undefined> {
        return this.cachedSources.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public put(createDto: CreateUpdateSourceModel): Observable<ViewSourceModel> {
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