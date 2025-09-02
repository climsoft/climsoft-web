import { BehaviorSubject, catchError, map, Observable, Subscription, tap, throwError } from "rxjs";
import { Injectable } from "@angular/core";
import { MetadataUpdatesService } from "src/app/metadata/metadata-updates/metadata-updates.service";
import { AppDatabase } from "src/app/app-database";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { AppConfigService } from "src/app/app-config.service";
import { ViewQCTestModel } from "src/app/metadata/qc-tests/models/view-qc-test.model";
import { CreateQCTestModel, QCTestParametersValidity } from "src/app/metadata/qc-tests/models/create-qc-test.model";
import { QCTestTypeEnum } from "src/app/metadata/qc-tests/models/qc-test-type.enum";
import { RangeThresholdQCTestParamsModel } from "src/app/metadata/qc-tests/models/qc-test-parameters/range-qc-test-params.model";
import { FlatLineQCTestParamsModel } from "src/app/metadata/qc-tests/models/qc-test-parameters/flat-line-qc-test-params.model";
import { SpikeQCTestParamsModel } from "src/app/metadata/qc-tests/models/qc-test-parameters/spike-qc-test-params.model";
import { RelationalQCTestParamsModel } from "src/app/metadata/qc-tests/models/qc-test-parameters/relational-qc-test-params.model";
import { ContextualQCTestParamsModel } from "src/app/metadata/qc-tests/models/qc-test-parameters/contextual-qc-test-params.model";
import { IntervalsUtil } from "src/app/shared/controls/period-input/Intervals.util";

export interface QCTestCacheModel {
    id: number;
    name: string;
    description: string | null;
    elementId: number;
    observationLevel: number;
    observationInterval: number;
    observationIntervalName: string;
    qcTestType: QCTestTypeEnum;
    qcTestTypeName: string,
    parameters: QCTestParametersValidity;
    formattedParameters: string;
    disabled: boolean;
    comment: string | null;
}


@Injectable({
    providedIn: 'root'
})
export class QCTestsCacheService {
    private endPointUrl: string;
    private readonly _cachedElements: BehaviorSubject<QCTestCacheModel[]> = new BehaviorSubject<QCTestCacheModel[]>([]);
    private checkUpdatesSubscription: Subscription = new Subscription();
    private checkingForUpdates: boolean = false;

    constructor(
        private appConfigService: AppConfigService,
        private metadataUpdatesService: MetadataUpdatesService,
        private http: HttpClient) {
        this.endPointUrl = `${this.appConfigService.apiBaseUrl}/qc-tests`;
        this.loadElementsQcTests();
    }

    private async loadElementsQcTests() {
        const newCachedElementsQcTests: QCTestCacheModel[] = [];
        const elementsQcTestsFromServer: ViewQCTestModel[] = await AppDatabase.instance.qcTests.toArray();
        for (const elementQCTest of elementsQcTestsFromServer) {
            let formattedParameters: string = '';
            switch (elementQCTest.qcTestType) {
                case QCTestTypeEnum.RANGE_THRESHOLD:
                    const rangeParams = elementQCTest.parameters as RangeThresholdQCTestParamsModel;
                    formattedParameters = `{ Lower threshold : ${rangeParams.lowerThreshold} } { Upper threshold : ${rangeParams.upperThreshold} }`;
                    break;
                case QCTestTypeEnum.FLAT_LINE:
                    const flatLineParams = elementQCTest.parameters as FlatLineQCTestParamsModel;
                    let excludeStr = '';
                    if (flatLineParams.excludeRange) {
                        const excludeRange = flatLineParams.excludeRange;
                        excludeStr = `{ Exclude range: { Lower threshold: ${excludeRange.lowerThreshold} } { Upper threshold: ${excludeRange.upperThreshold} } } `
                    }
                    formattedParameters = `{ Consecutive records : ${flatLineParams.consecutiveRecords} } { Flat Line threshold : ${flatLineParams.flatLineThreshold} } ${excludeStr}`;
                    break;
                case QCTestTypeEnum.SPIKE:
                    const spikeParams = elementQCTest.parameters as SpikeQCTestParamsModel;
                    formattedParameters = `{ Spike threshold : ${spikeParams.spikeThreshold} }`;
                    break;
                case QCTestTypeEnum.RELATIONAL_COMPARISON:
                    const relationalParams = elementQCTest.parameters as RelationalQCTestParamsModel;
                    formattedParameters = `{ Condition : ${relationalParams.condition} } { Reference Element : ${relationalParams.referenceElementId} }`;
                    break;
                case QCTestTypeEnum.DIURNAL:
                    // TODO
                    break;
                case QCTestTypeEnum.CONTEXTUAL_CONSISTENCY:
                    const contextualParams = elementQCTest.parameters as ContextualQCTestParamsModel;
                    formattedParameters = `{ Primary check : {condition: ${contextualParams.primaryCheck.condition} value: ${contextualParams.primaryCheck.value} }  }  { Reference Element : ${contextualParams.referenceElementId} } { Reference check : {condition: ${contextualParams.referenceCheck.condition} value: ${contextualParams.referenceCheck.value} }  }`;
                    break;
                case QCTestTypeEnum.REMOTE_SENSING_CONSISTENCY:
                    // TODO
                    break;
                case QCTestTypeEnum.SPATIAL_CONSISTENCY:
                    // TODO
                    break;
                default:
                    throw new Error('Developer error. QC test type not supported.')
            }


            const obsIntervalName: string | undefined = IntervalsUtil.findInterval(elementQCTest.observationInterval)?.name;
            const formattedObsInterval: string = obsIntervalName ? obsIntervalName : elementQCTest.observationInterval.toString();

            newCachedElementsQcTests.push(
                {
                    id: elementQCTest.id,
                    name: elementQCTest.name,
                    description: elementQCTest.description? elementQCTest.description : '',
                    elementId: elementQCTest.elementId,
                    observationLevel: elementQCTest.observationLevel,
                    observationInterval: elementQCTest.observationInterval,
                    observationIntervalName: formattedObsInterval,
                    qcTestType: elementQCTest.qcTestType,
                    qcTestTypeName: StringUtils.formatEnumForDisplay(elementQCTest.qcTestType),
                    parameters: elementQCTest.parameters,
                    formattedParameters: formattedParameters,
                    disabled: elementQCTest.disabled,
                    comment: elementQCTest.comment ? elementQCTest.comment : '',
                }

            );
        }

        this._cachedElements.next(newCachedElementsQcTests);
    }

   
    public checkForUpdates(): void {
        // If still checking for updates just return
        if (this.checkingForUpdates) return;

        console.log('checking qc tests updates');

        this.checkingForUpdates = true;
        this.checkUpdatesSubscription.unsubscribe();
        // Observable to initiate metadata updates sequentially
        this.checkUpdatesSubscription = this.metadataUpdatesService.checkUpdates('qcTests').subscribe({
            next: res => {
                console.log('qc-tests-cache response', res);
                this.checkingForUpdates = false;
                if (res) {
                    this.loadElementsQcTests();
                }
            },
            error: err => {
                this.checkingForUpdates = false;
            }
        });
    }

    public get cachedQCTests(): Observable<QCTestCacheModel[]> {
        this.checkForUpdates();
        return this._cachedElements.asObservable();
    }

    public findOne(id: number): Observable<QCTestCacheModel | undefined> {
        return this.cachedQCTests.pipe(
            map(response => {
                return response.find(item => item.id === id);
            })
        );
    }

    public findByElement(elementId: number): Observable<QCTestCacheModel[]> {
        return this.cachedQCTests.pipe(
            map(response => {
                return response.filter(item => item.elementId === elementId);
            })
        );
      }

    public add(createDto: CreateQCTestModel): Observable<ViewQCTestModel> {
        return this.http.post<ViewQCTestModel>(`${this.endPointUrl}`, createDto)
            .pipe(
                tap(() => {
                    this.checkForUpdates();
                }),
                catchError(this.handleError)
            );
    }

    public update(id: number, updateDto: CreateQCTestModel): Observable<ViewQCTestModel> {
        return this.http.patch<ViewQCTestModel>(`${this.endPointUrl}/${id}`, updateDto)
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