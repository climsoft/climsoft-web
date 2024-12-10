import { BehaviorSubject, catchError, concatMap, map, Observable, of, take, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { environment } from "src/environments/environment";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { CreateViewElementModel } from "../models/create-view-element.model";
import { UpdateElementModel } from "../models/update-element.model";
import { ElementDomainEnum } from "../models/element-domain.enum";
import { ViewElementTypeModel } from "../models/view-element-type.model";
import { ViewElementSubdomainModel } from "../models/view-element-subdomain.model";
import { StringUtils } from "src/app/shared/utils/string.utils";

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
    private endPointUrl: string = `${environment.apiUrl}/elements`;
    private readonly _cachedElements: BehaviorSubject<ElementCacheModel[]> = new BehaviorSubject<ElementCacheModel[]>([]);

    constructor(
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.loadElements();
        //this.checkForUpdates();
    }

    private async loadElements() {
        const elementTypes: ViewElementTypeModel[] = await this.getElementTypes();
        const elementSubdomains: ViewElementSubdomainModel[] = await this.getElementSubdomains();
        const newCachedElements: ElementCacheModel[] = [];

        await AppDatabase.instance.elements.each(element => {
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
                    subdomainId: elementSubdomain ? elementSubdomain.id : 0,
                    subdomainName: elementSubdomain ? elementSubdomain.name : '',
                    domain: domain,
                    domainName: StringUtils.formatEnumForDisplay(domain),
                    entryScaleFactor: element.entryScaleFactor,
                    comment: element.comment ? element.comment : '',
                }
            );
        });

        this._cachedElements.next(newCachedElements);
    }

    public async getElementSubdomains(): Promise<ViewElementSubdomainModel[]> {
        return await AppDatabase.instance.elementSubdomains.toArray();
    }

    public async getElementTypes(): Promise<ViewElementTypeModel[]> {
        return await AppDatabase.instance.elementTypes.toArray();
    }

    public checkForUpdates() {
        // Observable to initiate metadata updates sequentially
        of(null).pipe(
            concatMap(() => this.metadataUpdatesService.checkUpdates('elementTypes')),
            concatMap(() => this.metadataUpdatesService.checkUpdates('elementSubdomains')),
            concatMap(() => this.metadataUpdatesService.checkUpdates('elements')),
        ).subscribe(res => {
            console.log('elements-cache response', res);
            if (res) {
                this.loadElements();
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

    public create(createDto: CreateViewElementModel): Observable<CreateViewElementModel> {
        return this.http.post<CreateViewElementModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public update(id: number, updateDto: UpdateElementModel): Observable<CreateViewElementModel> {
        return this.http.patch<CreateViewElementModel>(`${this.endPointUrl}/${id}`, updateDto)
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

    public get downloadLink(): string {
        return `${this.endPointUrl}/download`;
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