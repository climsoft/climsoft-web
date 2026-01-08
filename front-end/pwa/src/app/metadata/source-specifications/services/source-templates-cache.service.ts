import { BehaviorSubject, map, Observable, Subscription, tap } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient } from "@angular/common/http";
import { ViewSourceModel } from "../models/view-source.model";
import { CreateSourceModel } from "../models/create-source.model";
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

    public add(createDto: CreateSourceModel): Observable<ViewSourceModel> {
        return this.http.post<ViewSourceModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public update(id: number, updateDto: CreateSourceModel): Observable<ViewSourceModel> {
        return this.http.patch<ViewSourceModel>(`${this.endPointUrl}/${id}`, updateDto)
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