import { BehaviorSubject, catchError, map, Observable, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { ElementCacheModel, ElementsCacheService } from "../elements/services/elements-cache.service";
import { SourceTemplatesCacheService } from "../source-templates/services/source-templates-cache.service";
import { ViewSourceModel } from "../source-templates/models/view-source.model";
import { StationCacheModel, StationsCacheService } from "../stations/services/stations-cache.service";
import { QCTestCacheModel, QCTestsCacheService } from "../qc-tests/services/qc-tests-cache.service";
import { GeneralSettingsService } from "src/app/admin/general-settings/services/general-settings.service";
import { SettingIdEnum } from "src/app/admin/general-settings/models/setting-id.enum";
import { ClimsoftDisplayTimeZoneModel } from "src/app/admin/general-settings/models/settings/climsoft-display-timezone.model";
import { CreateViewGeneralSettingModel } from "src/app/admin/general-settings/models/create-view-general-setting.model";


@Injectable({
    providedIn: 'root'
})
export class CachedMetadataService {
    private _stationsMetadata!: StationCacheModel[];
    private _elementsMetadata!: ElementCacheModel[];
    private _sourcesMetadata!: ViewSourceModel[];
    private _qcTestsMetadata!: QCTestCacheModel[];
    private _generalSettingsMetadata!: CreateViewGeneralSettingModel[];
    private readonly _allMetadataLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private checkingForUpdates: boolean = false;

    constructor(
        private stationsCacheService: StationsCacheService,
        private elementsCacheService: ElementsCacheService,
        private sourcesCacheService: SourceTemplatesCacheService,
        private qcTestsCacheService: QCTestsCacheService,
        private generalSettingsCacheService: GeneralSettingsService,
    ) {

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

        this.qcTestsCacheService.cachedQCTests.subscribe(data => {
            this._qcTestsMetadata = data;
            this.setMetadataLoaded();
        });

        this.generalSettingsCacheService.cachedGeneralSettings.subscribe(data => { 
            this._generalSettingsMetadata = data;
            this.setMetadataLoaded();
        });
    }

    private setMetadataLoaded(): void {
        if (this._stationsMetadata && this._stationsMetadata.length > 0
            && this._elementsMetadata && this._elementsMetadata.length > 0
            && this._sourcesMetadata && this._sourcesMetadata.length > 0
            && this._qcTestsMetadata && this._qcTestsMetadata.length > 0
            && this._generalSettingsMetadata && this._generalSettingsMetadata.length > 0) {
            this._allMetadataLoaded.next(true);
        }
    }

    public get allMetadataLoaded(): Observable<boolean> {
        if (!this.checkingForUpdates) {
            this.stationsCacheService.checkForUpdates();
            this.elementsCacheService.checkForUpdates();
            this.sourcesCacheService.checkForUpdates();
            this.qcTestsCacheService.checkForUpdates();
            this.generalSettingsCacheService.checkForUpdates();

            // Disable the checking of all metadata for 5 seconds.
            // this reduces the number of round trips to the server
            this.checkingForUpdates = true;
            setTimeout(() => {
                this.checkingForUpdates = false;
                console.log('checking of metadata updates reset');
            }, 5000);
        }
        return this._allMetadataLoaded.asObservable();
    }

    public get stationsMetadata(): StationCacheModel[] {
        if (!this._allMetadataLoaded.value) throw new Error('Developer error. Stations metadata not yet loaded.');
        return this._stationsMetadata;
    }

    public get elementsMetadata(): ElementCacheModel[] {
        if (!this._allMetadataLoaded.value) throw new Error('Developer error. Elements metadata not yet loaded.');
        return this._elementsMetadata;
    }

    public get sourcesMetadata(): ViewSourceModel[] {
        if (!this._allMetadataLoaded.value) throw new Error('Developer error. Sources metadata not yet loaded.');
        return this._sourcesMetadata;
    }

    public get qcTestsMetadata(): QCTestCacheModel[] {
        if (!this._allMetadataLoaded.value) throw new Error('Developer error. QC tests metadata not yet loaded.');
        return this._qcTestsMetadata;
    }

    public get generalSettingsMetadata(): CreateViewGeneralSettingModel[] {
        if (!this._allMetadataLoaded.value) throw new Error('Developer error. General setings metadata not yet loaded.');
        return this._generalSettingsMetadata;
    }

    public get utcOffSet(): number {
        return (this.getGeneralSetting(SettingIdEnum.DISPLAY_TIME_ZONE).parameters as ClimsoftDisplayTimeZoneModel).utcOffset;
    }

    public getStation(stationId: string): StationCacheModel {
        if (!this._allMetadataLoaded.value) {
            throw new Error(`Developer error: Metadata not full loaded. Stations not usable.`);
        }
        const metadata = this._stationsMetadata.find(item => item.id === stationId);
        if (!metadata) {
            throw new Error(`Developer error: Station not found. ${stationId}`);
        }
        return metadata;
    }

    public getElement(elementId: number): ElementCacheModel {
        if (!this._allMetadataLoaded.value) {
            throw new Error(`Developer error: Metadata not full loaded. Elements not usable.`);
        }

        const metadata = this._elementsMetadata.find(item => item.id === elementId);
        if (!metadata) {
            throw new Error(`Developer error: Element not found. ${elementId}`);
        }
        return metadata;
    }

    public getSource(sourceId: number): ViewSourceModel {
        if (!this._allMetadataLoaded.value) {
            throw new Error(`Developer error: Metadata not full loaded. Sources not usable.`);
        }

        const metadata = this._sourcesMetadata.find(item => item.id === sourceId);
        if (!metadata) {
            throw new Error(`Developer error: Source not found. ${sourceId}`);
        }
        return metadata;
    }

    public getQCTest(qcTestId: number): QCTestCacheModel {
        if (!this._allMetadataLoaded.value) {
            throw new Error(`Developer error: Metadata not full loaded. QC tests not usable.`);
        }

        const metadata = this._qcTestsMetadata.find(item => item.id === qcTestId);
        if (!metadata) {
            throw new Error(`Developer error: QC test not found. ${qcTestId}`);
        }
        return metadata;
    }

    // TODO. Deprecate this
    public getQCTestsFor(elementId: number, level: number, interval: number): QCTestCacheModel[] {
        if (!this._allMetadataLoaded.value) {
            throw new Error(`Developer error: Metadata not full loaded. QC tests not usable.`);
        }

        const qcTests: QCTestCacheModel[] = []

        for (const qcTest of this._qcTestsMetadata) {
            if (qcTest.elementId === elementId && qcTest.observationLevel === level && qcTest.observationInterval === interval) {
                qcTests.push(qcTest);
            }
        }
        return qcTests;
    }

    public getGeneralSetting(settingId: SettingIdEnum): CreateViewGeneralSettingModel {
        if (!this._allMetadataLoaded.value) {
            throw new Error(`Developer error: Metadata not full loaded. General setting not usable.`);
        }

        const metadata = this._generalSettingsMetadata.find(item => item.id === settingId);
        if (!metadata) {
            throw new Error(`Developer error: General setting not found. ${settingId}`);
        }
        return metadata;
    }

}