import { BehaviorSubject, concatMap, map, Observable, of, Subscription, tap } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient } from "@angular/common/http";
import { CreateViewElementModel } from "../models/create-view-element.model";
import { UpdateElementModel } from "../models/update-element.model";
import { ElementDomainEnum } from "../models/element-domain.enum";
import { ViewElementTypeModel } from "../models/view-element-type.model";
import { ViewElementSubdomainModel } from "../models/view-element-subdomain.model";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { AppConfigService } from "src/app/app-config.service";

export interface ElementCacheModel {
    id: number;
    abbreviation: string;
    name: string;
    description: string;
    units: string;
    typeId: number;
    typeName: string;
    subdomainId: number;
    subdomainName: string;
    domain: ElementDomainEnum;
    domainName: string;
    entryScaleFactor: number;
    comment: string;
}

@Injectable({
    providedIn: 'root'
})
export class ElementsCacheService {
    private endPointUrl: string;
    private readonly _cachedElements: BehaviorSubject<ElementCacheModel[]> = new BehaviorSubject<ElementCacheModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    private checkingForUpdates: boolean = false;

    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/elements`;
        this.loadElements();
    }

    private async loadElements() {
        const elementTypes: ViewElementTypeModel[] = await this.getElementTypes();
        const elementSubdomains: ViewElementSubdomainModel[] = await this.getElementSubdomains();
        const newCachedElements: ElementCacheModel[] = [];
        const elementsFromServer: CreateViewElementModel[] = await AppDatabase.instance.elements.toArray();
        for (const element of elementsFromServer) {
            const elementType = elementTypes.find(item => item.id === element.typeId);
            const elementSubdomain = elementSubdomains.find(item => item.id === elementType?.id);
            const domain = elementSubdomain ? elementSubdomain.domain : ElementDomainEnum.ATMOSPHERE;

            newCachedElements.push(
                {
                    id: element.id,
                    abbreviation: element.abbreviation,
                    name: element.name,
                    description: element.description,
                    units: element.units,
                    typeId: element.typeId,
                    typeName: elementType ? elementType.name : '',
                    subdomainId: (elementSubdomain ? elementSubdomain.id : 0),
                    subdomainName: elementSubdomain ? elementSubdomain.name : '',
                    domain: domain,
                    domainName: StringUtils.formatEnumForDisplay(domain),
                    entryScaleFactor: element.entryScaleFactor,
                    comment: element.comment ? element.comment : '',
                }
            );
        }

        this._cachedElements.next(newCachedElements);
    }

    public async getElementSubdomains(): Promise<ViewElementSubdomainModel[]> {
        return await AppDatabase.instance.elementSubdomains.toArray();
    }

    public async getElementTypes(): Promise<ViewElementTypeModel[]> {
        return await AppDatabase.instance.elementTypes.toArray();
    }

    public checkForUpdates(): void {
        // If still checking for updates just return
        if (this.checkingForUpdates) return;

        console.log('checking elements updates');

        this.checkingForUpdates = true;
        this.checkUpdatesSubscription.unsubscribe();
        // Observable to initiate metadata updates sequentially
        this.checkUpdatesSubscription = of(null).pipe(
            concatMap(() => this.metadataUpdatesService.checkUpdates('elementTypes')),
            concatMap(() => this.metadataUpdatesService.checkUpdates('elementSubdomains')),
            concatMap(() => this.metadataUpdatesService.checkUpdates('elements')),
        ).subscribe({
            next: res => {
                console.log('elements-cache response', res);
                this.checkingForUpdates = false;
                if (res) {
                    this.loadElements();
                }
            },
            error: err => {
                this.checkingForUpdates = false;
            }
        });
    }

    public get cachedElements(): Observable<ElementCacheModel[]> {
        this.checkForUpdates();
        return this._cachedElements.asObservable();
    }

    public findOne(id: number): Observable<ElementCacheModel | undefined> {
        return this.cachedElements.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public add(createDto: CreateViewElementModel): Observable<CreateViewElementModel> {
        return this.http.post<CreateViewElementModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
            );
    }

    public update(id: number, updateDto: UpdateElementModel): Observable<CreateViewElementModel> {
        return this.http.patch<CreateViewElementModel>(`${this.endPointUrl}/${id}`, updateDto)
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

    public get downloadLink(): string {
        return `${this.endPointUrl}/download`;
    }

}