import { BehaviorSubject, map, Observable, Subscription, tap } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient } from "@angular/common/http";
import { ViewSourceSpecificationModel } from "../models/view-source-specification.model";
import { CreateSourceSpecificationModel } from "../models/create-source-specification.model";
import { AppConfigService } from "src/app/app-config.service";

@Injectable({
    providedIn: 'root'
})
export class SourcesCacheService {
    private endPointUrl: string;
    private readonly _cachedSources: BehaviorSubject<ViewSourceSpecificationModel[]> = new BehaviorSubject<ViewSourceSpecificationModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription(); // Deprecate this
    private checkingForUpdates: boolean = false;

    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/source-specifications`;
        this.loadSources();
    }

    private async loadSources() {
        this._cachedSources.next(await AppDatabase.instance.sourceTemplates.toArray());
    }

    public checkForUpdates(): void {
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

    public get cachedSources(): Observable<ViewSourceSpecificationModel[]> {
        this.checkForUpdates();
        return this._cachedSources.asObservable();
    }

    public findOne(id: number): Observable<ViewSourceSpecificationModel | undefined> {
        return this.cachedSources.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public add(createDto: CreateSourceSpecificationModel): Observable<ViewSourceSpecificationModel> {
        return this.http.post<ViewSourceSpecificationModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public update(id: number, updateDto: CreateSourceSpecificationModel): Observable<ViewSourceSpecificationModel> {
        return this.http.patch<ViewSourceSpecificationModel>(`${this.endPointUrl}/${id}`, updateDto)
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