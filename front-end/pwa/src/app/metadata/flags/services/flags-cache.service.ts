import { BehaviorSubject, concatMap, map, Observable, of, Subscription, tap } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient } from "@angular/common/http";
import { ViewFlagModel } from "../models/view-flag.model";
import { AppConfigService } from "src/app/app-config.service";
import { CreateUpdateFlagModel } from "../models/create-update-flag.model";

@Injectable({
    providedIn: 'root'
})
export class FlagsCacheService {
    private endPointUrl: string;
    private readonly _cachedFlags: BehaviorSubject<ViewFlagModel[]> = new BehaviorSubject<ViewFlagModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    private checkingForUpdates: boolean = false;

    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/flags`;
        this.loadFlags();
    }

    private async loadFlags() {
        const flagsFromDb: ViewFlagModel[] = await AppDatabase.instance.flags.toArray();
        this._cachedFlags.next(flagsFromDb);
    }

    public checkForUpdates(): void {
        if (this.checkingForUpdates) return;

        console.log('checking flags updates');

        this.checkingForUpdates = true;
        this.checkUpdatesSubscription.unsubscribe();
        this.checkUpdatesSubscription = of(null).pipe(
            concatMap(() => this.metadataUpdatesService.checkUpdates('flags')),
        ).subscribe({
            next: res => {
                console.log('flags-cache response', res);

                this.checkingForUpdates = false;
                if (res) {
                    this.loadFlags();
                }
            },
            error: () => {
                this.checkingForUpdates = false;
            }
        });
    }

    public get cachedFlags(): Observable<ViewFlagModel[]> {
        this.checkForUpdates();
        return this._cachedFlags.asObservable();
    }

    public findOne(id: number): Observable<ViewFlagModel | undefined> {
        return this.cachedFlags.pipe(
            map(response => response.find(item => item.id === id))
        );
    }

    public add(createDto: CreateUpdateFlagModel): Observable<ViewFlagModel> {
        return this.http.post<ViewFlagModel>(`${this.endPointUrl}`, createDto)
            .pipe(tap(() => this.checkForUpdates()));
    }

    public update(id: number, updateDto: CreateUpdateFlagModel): Observable<ViewFlagModel> {
        return this.http.patch<ViewFlagModel>(`${this.endPointUrl}/${id}`, updateDto)
            .pipe(tap(() => this.checkForUpdates()));
    }

    public delete(id: number): Observable<number> {
        return this.http.delete<number>(`${this.endPointUrl}/${id}`)
            .pipe(tap(() => this.checkForUpdates()));
    }

    public deleteAll(): Observable<boolean> {
        return this.http.delete<boolean>(`${this.endPointUrl}`)
            .pipe(tap(() => this.checkForUpdates()));
    }
}
