import { BehaviorSubject, catchError, map, Observable, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { ElementCacheModel, ElementsCacheService } from "../elements/services/elements-cache.service";
import { SourceTemplatesCacheService } from "../source-templates/services/source-templates-cache.service";
import { ViewSourceModel } from "../source-templates/models/view-source.model";
import { StationCacheModel, StationsCacheService } from "../stations/services/stations-cache.service";
import { ElementQCTestCacheModel, ElementsQCTestsCacheService } from "../elements/services/elements-qc-tests-cache.service";


@Injectable({
    providedIn: 'root'
})
export class CachedMetadataSearchService {
    private _stationsMetadata: StationCacheModel[] = [];
    private _elementsMetadata: ElementCacheModel[] = [];
    private _sourcesMetadata: ViewSourceModel[] = [];
    private _elementQcTestsMetadata: ElementQCTestCacheModel[] = [];
    private readonly _allMetadataLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(
        private stationsCacheService: StationsCacheService,
        private elementsCacheService: ElementsCacheService,
        private sourcesCacheService: SourceTemplatesCacheService,
        private elementsQCTestsCacheService: ElementsQCTestsCacheService,) {

        this.stationsCacheService.cachedStations.subscribe(data => {
            this._stationsMetadata = data;
            this.setMetadataLoaded();
        });

        this.elementsCacheService.cachedElements.subscribe(data => {
            this._elementsMetadata = data;
            this.setMetadataLoaded();
        });

        this.sourcesCacheService.cachedSources.subscribe(data => {
            this._sourcesMetadata = data;
            this.setMetadataLoaded();
        });

        this.elementsQCTestsCacheService.cachedElementsQcTests.subscribe(data => {
            this._elementQcTestsMetadata = data;
            this.setMetadataLoaded();
        });
    }

    private setMetadataLoaded(): void {
        if (this._stationsMetadata && this._stationsMetadata.length > 0
            && this._elementsMetadata && this._elementsMetadata.length > 0
            && this._sourcesMetadata && this._sourcesMetadata.length > 0
            && this._elementQcTestsMetadata && this._elementQcTestsMetadata.length > 0) {
            this._allMetadataLoaded.next(true);
        }
    }

    public get allMetadataLoaded(): Observable<boolean> {
        return this._allMetadataLoaded.asObservable();
    }

    public getStation(stationId: string): StationCacheModel {
        const metadata = this._stationsMetadata.find(item => item.id === stationId);
        if (!metadata) {
            throw new Error(`Developer error: Station not found. ${stationId}`);
        }
        return metadata;
    }

    public getElement(elementId: number): ElementCacheModel {
        const metadata = this._elementsMetadata.find(item => item.id === elementId);
        if (!metadata) {
            throw new Error(`Developer error: Element not found. ${elementId}`);
        }
        return metadata;
    }

    public getSource(sourceId: number): ViewSourceModel {
        const metadata = this._sourcesMetadata.find(item => item.id === sourceId);
        if (!metadata) {
            throw new Error(`Developer error: Source not found. ${sourceId}`);
        }
        return metadata;
    }

    public getElementQCTest(qcTestId: number): ElementQCTestCacheModel {
        const metadata = this._elementQcTestsMetadata.find(item => item.id === qcTestId);
        if (!metadata) {
            throw new Error(`Developer error: Element QC test not found. ${qcTestId}`);
        }
        return metadata;
    }
}