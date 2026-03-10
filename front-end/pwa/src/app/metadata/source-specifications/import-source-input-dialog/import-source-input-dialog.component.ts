import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { ImportSourceTabularParamsModel } from '../models/import-source-tabular-params.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { Observable, Subject, switchMap, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { CreateSourceSpecificationModel } from 'src/app/metadata/source-specifications/models/create-source-specification.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { SourcesCacheService } from '../services/source-cache.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ImportPreviewHttpService } from '../services/import-preview.service';
import { RawPreviewResponse, TransformedPreviewResponse } from '../models/import-preview.model';

type WizardStep = 'upload' | 'station' | 'element' | 'level' | 'datetime' | 'interval' | 'value' | 'review';

@Component({
    selector: 'app-import-source-input-dialog',
    templateUrl: './import-source-input-dialog.component.html',
    styleUrls: ['./import-source-input-dialog.component.scss']
})
export class ImportSourceInputDialogComponent implements OnDestroy {
    @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;

    @Output()
    public ok = new EventEmitter<void>();

    protected open: boolean = false;
    protected title: string = '';
    protected importSource!: ViewSourceModel;

    // Wizard state
    protected activeStep: WizardStep = 'upload';
    protected readonly wizardSteps: WizardStep[] = ['upload', 'station', 'element', 'level', 'datetime', 'interval', 'value', 'review'];
    protected readonly stepLabels: Record<WizardStep, string> = {
        upload: 'File & Basics',
        station: 'Station',
        element: 'Elements',
        level: 'Level',
        datetime: 'Date & Time',
        interval: 'Interval',
        value: 'Value & More',
        review: 'Review',
    };
    protected visitedSteps: Set<WizardStep> = new Set(['upload']);

    // File Preview state
    protected rawPreviewResponse!: RawPreviewResponse;
    protected transformedPreviewResponse!: TransformedPreviewResponse;
    protected rawPreviewLoading: boolean = false;
    protected transformedPreviewLoading: boolean = false;
    protected uploadedFileName: string = '';
    protected saving: boolean = false;

    private destroy$ = new Subject<void>();

    constructor(
        private pagesDataService: PagesDataService,
        private sourcesCacheService: SourcesCacheService,
        private importPreviewService: ImportPreviewHttpService,
    ) {
        // Reset all state
        this.resetSamplePreview();

    }

    public openDialog(sourceId?: number): void {
        // Reset all state
        this.cleanupSession();
        this.resetSamplePreview();
        this.activeStep = 'upload';
        this.uploadedFileName = '';
        this.visitedSteps = new Set(['upload']);

        this.open = true;

        if (sourceId) {
            this.title = 'Edit Import Specification';
            // Mark all steps as visited for existing specifications
            this.wizardSteps.forEach(s => this.visitedSteps.add(s));

            this.sourcesCacheService.findOne(sourceId).pipe(
                takeUntil(this.destroy$),
            ).subscribe((data) => {
                if (data) {
                    this.importSource = data;
                    this.initPreviewFromSavedFile();
                }
            });

        } else {
            this.title = 'New Import Specification';

            const defaultTabularDefs: ImportSourceTabularParamsModel = {
                rowsToSkip: 1,
                delimiter: undefined,
                stationDefinition: undefined,
                elementDefinition: {
                    hasElement: {
                        singleColumn: {
                            elementColumnPosition: 0,
                        }
                    }
                },
                levelDefinition: {
                    columnPosition: 0,
                },
                datetimeDefinition: {
                    dateTimeInSingleColumn: {
                        columnPosition: 0,
                        datetimeFormat: '%Y-%m-%d %H:%M',
                    }
                },
                intervalDefinition: {
                    columnPosition: 0,
                },
                valueDefinition: {
                    valueColumnPosition: 0,
                },
            };

            const defaultImportSourceDefs: ImportSourceModel = {
                dataStructureType: DataStructureTypeEnum.TABULAR,
                sourceMissingValueIndicators: '',
                dataStructureParameters: defaultTabularDefs,
            };

            this.importSource = {
                id: 0,
                name: '',
                description: '',
                sourceType: SourceTypeEnum.IMPORT,
                allowMissingValue: false,
                sampleFileName: '',
                utcOffset: 0,
                parameters: defaultImportSourceDefs,
                scaleValues: false,
                disabled: false,
                comment: '',
            };
        }
    }

    ngOnDestroy(): void {
        this.cleanupSession();
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ─── Accessors ───

    protected get importSourceParams(): ImportSourceModel {
        return this.importSource.parameters as ImportSourceModel;
    }

    protected get tabularImportParams(): ImportSourceTabularParamsModel {
        return this.importSourceParams.dataStructureParameters as ImportSourceTabularParamsModel;
    }

    // ─── Wizard Navigation ───

    protected onStepTabClick(step: WizardStep): void {
        this.activeStep = step;
        this.visitedSteps.add(step);
        this.refreshPreview();
    }

    protected onNext(): void {
        const currentIndex = this.wizardSteps.indexOf(this.activeStep);
        if (currentIndex < this.wizardSteps.length - 1) {
            this.activeStep = this.wizardSteps[currentIndex + 1];
            this.visitedSteps.add(this.activeStep);
            if (this.rawPreviewResponse.sessionId) {
                this.refreshPreview();
            }
        }
    }

    protected onPrevious(): void {
        const currentIndex = this.wizardSteps.indexOf(this.activeStep);
        if (currentIndex > 0) {
            this.activeStep = this.wizardSteps[currentIndex - 1];
            this.visitedSteps.add(this.activeStep);
            this.refreshPreview();
        }
    }

    protected isStepDisabled(step: WizardStep): boolean {
        if (step === 'upload') return false;
        // Allow navigation when editing an existing spec or when a session exists
        return !this.rawPreviewResponse.sessionId && !(this.importSource?.id > 0);
    }

    protected getStepNumber(step: WizardStep): number {
        return this.wizardSteps.indexOf(step) + 1;
    }

    protected getStepValidationErrors(step: WizardStep): string[] {
        if (!this.importSource) return [];
        const errors: string[] = [];
        const params = this.tabularImportParams;

        switch (step) {
            case 'upload':
                if (!this.importSource.name) errors.push('Name is required');
                if (!this.importSource.description) errors.push('Description is required');
                if (!this.rawPreviewResponse.sessionId) errors.push('Sample file is required');
                break;
            case 'station':
                // Station is optional — no validation errors
                break;
            case 'element':
                if (!params.elementDefinition.hasElement && !params.elementDefinition.noElement) {
                    errors.push('Element definition is required');
                }
                break;
            case 'level':
                // Level is optional — no validation errors
                break;
            case 'datetime':
                if (!params.datetimeDefinition.dateTimeInSingleColumn &&
                    !params.datetimeDefinition.dateInSingleColumn &&
                    !params.datetimeDefinition.dateTimeInTwoColumns &&
                    !params.datetimeDefinition.dateTimeInMultipleColumns &&
                    !params.datetimeDefinition.dateInMultipleColumns) {
                    errors.push('Date/time definition is required');
                }
                break;
            case 'interval':
                // Interval has defaults — no validation errors
                break;
            case 'value':
                // Value can be undefined for multi-column elements
                break;
            case 'review':
                break;
        }
        return errors;
    }

    protected isStepValid(step: WizardStep): boolean {
        return this.getStepValidationErrors(step).length === 0;
    }

    protected hasStepBeenVisited(step: WizardStep): boolean {
        return this.visitedSteps.has(step);
    }

    // ─── File Upload ───

    protected onFileSelected(file: File): void {
        this.uploadedFileName = file.name;

        this.rawPreviewLoading = true;
        this.transformedPreviewLoading = true;
        this.transformedPreviewResponse.error = undefined;

        this.importPreviewService.upload(
            file,
            this.tabularImportParams.rowsToSkip,
            this.tabularImportParams.delimiter,
        ).pipe(take(1)).subscribe({
            next: (res: RawPreviewResponse) => {
                this.rawPreviewLoading = false;
                this.transformedPreviewLoading = false;
                this.importSource.sampleFileName = res.fileName;
                this.rawPreviewResponse = res;
                this.transformedPreviewResponse = {
                    previewData: res.previewData,
                };
            },
            error: (err) => {
                this.rawPreviewLoading = false;
                this.transformedPreviewLoading = false;
                this.pagesDataService.showToast({ title: 'Upload Error', message: err.error?.message || 'Failed to upload file', type: ToastEventTypeEnum.ERROR });
                console.error('Preview upload error:', err);
            }
        });
    }

    private initPreviewFromSavedFile(): void {
        if (!this.importSource.sampleFileName) return;

        this.rawPreviewLoading = true;
        this.transformedPreviewLoading = true;

        this.importPreviewService.initFromFile(
            this.importSource.sampleFileName,
            this.tabularImportParams.rowsToSkip,
            this.tabularImportParams.delimiter,
        ).pipe(
            take(1),
            // Step 2: Store raw preview data, then run the transformation preview
            switchMap((rawResponse: RawPreviewResponse) => {
                this.rawPreviewLoading = false;
                this.uploadedFileName = rawResponse.fileName;
                this.rawPreviewResponse = rawResponse;
                const previewDef = this.getTransformedPreviewDefinition();
                return this.importPreviewService.previewStep(
                    this.rawPreviewResponse.sessionId,
                    previewDef[0],
                    previewDef[1],
                );
            }),
        ).subscribe({
            next: (transformedResponse: TransformedPreviewResponse) => {
                this.transformedPreviewLoading = false;
                this.transformedPreviewResponse = transformedResponse;
            },
            error: (err) => {
                // File no longer exists on server — silently fall back to "upload a sample file" prompt
                this.rawPreviewLoading = false;
                this.transformedPreviewLoading = false;
                console.error('Error initializing preview from saved file.', err);

            }
        });
    }

    protected reLoadRawPreview(): void {
        if (!this.rawPreviewResponse.sessionId) return;

        if (this.rawPreviewLoading && this.transformedPreviewLoading) {
            // TODO. Display message showing that the 2 previews are still loading
            return;
        }

        this.rawPreviewLoading = true;
        this.transformedPreviewLoading = true;
        this.transformedPreviewResponse.error = undefined;

        this.importPreviewService.updateBaseParams(
            this.rawPreviewResponse.sessionId,
            this.tabularImportParams.rowsToSkip,
            this.tabularImportParams.delimiter,
        ).pipe(take(1)).subscribe({
            next: (res: RawPreviewResponse) => {
                this.rawPreviewLoading = false;
                this.transformedPreviewLoading = false;
                this.rawPreviewResponse = res;
                this.transformedPreviewResponse = {
                    previewData: res.previewData,
                };
            },
            error: (err) => {
                this.rawPreviewLoading = false;
                this.transformedPreviewLoading = false;
                const message = err instanceof HttpErrorResponse ? err.error?.message : 'Failed to load raw preview.';
                this.transformedPreviewResponse.error = { type: 'SQL_EXECUTION_ERROR', message };
                console.error('Raw preview error:', err);
            }
        });
    }


    // ─── Preview ───

    protected refreshPreview(): void {
        if (!this.rawPreviewResponse.sessionId) return;

        // If we're on the initial upload step, always refresh the raw preview without re-processing the file
        // Important when user needs to see the original preview even after changing parameters in the later steps
        if (this.activeStep === 'upload') {
            this.reLoadRawPreview();
            return;
        }

        if (this.transformedPreviewLoading) {
            // TODO. Display message showing that the transform preview is still loading
            return;
        }

        this.transformedPreviewLoading = true;

        const previewDef = this.getTransformedPreviewDefinition();

        this.importPreviewService.previewStep(
            this.rawPreviewResponse.sessionId,
            previewDef[0],
            previewDef[1],
        ).pipe(take(1)).subscribe({
            next: (res: TransformedPreviewResponse) => {
                this.transformedPreviewLoading = false;
                this.transformedPreviewResponse = res;
            },
            error: (err) => {
                this.transformedPreviewLoading = false;
                const message = err instanceof HttpErrorResponse ? err.error?.message : 'Failed to generate preview.';
                this.transformedPreviewResponse.error = { type: 'SQL_EXECUTION_ERROR', message };
                console.error('Preview step error:', err);
            }
        });
    }

    private getTransformedPreviewDefinition(): [CreateSourceSpecificationModel, string | undefined] {
        const sourceDefinition: CreateSourceSpecificationModel = {
            name: this.importSource.name,
            description: this.importSource.description,
            sourceType: SourceTypeEnum.IMPORT,
            scaleValues: this.importSource.scaleValues,
            allowMissingValue: this.importSource.allowMissingValue,
            sampleFileName: this.importSource.sampleFileName,
            utcOffset: this.importSource.utcOffset,
            parameters: this.importSource.parameters,
            disabled: this.importSource.disabled,
            comment: this.importSource.comment,
        };

        // If station is not defined in the file, pass a placeholder station ID for preview
        let stationId: string | undefined;
        if (!this.tabularImportParams.stationDefinition) {
            stationId = 'PREVIEW_STATION';
        }
        return [sourceDefinition, stationId]
    }

    // ─── Element / DateTime change handler ───

    protected onElementOrDatetimeDefChanged(): void {
        const sourceParameters = this.importSourceParams.dataStructureParameters as ImportSourceTabularParamsModel;
        if (sourceParameters.elementDefinition.hasElement && sourceParameters.elementDefinition.hasElement.multipleColumn) {
            sourceParameters.valueDefinition = undefined;
        } else if (sourceParameters.datetimeDefinition.dateTimeInMultipleColumns) {
            const dayColumns = sourceParameters.datetimeDefinition.dateTimeInMultipleColumns.dayColumnPosition.split('-');
            if (dayColumns.length > 1) {
                sourceParameters.valueDefinition = undefined;
            }
        } else if (sourceParameters.datetimeDefinition.dateInMultipleColumns) {
            const dayColumns = sourceParameters.datetimeDefinition.dateInMultipleColumns.dayColumnPosition.split('-');
            if (dayColumns.length > 1) {
                sourceParameters.valueDefinition = undefined;
            }
        } else {
            sourceParameters.valueDefinition = {
                valueColumnPosition: 0,
            };
        }
    }

    protected onDataStructureTypeSelected(dataStructureType: DataStructureTypeEnum | null): void {
        if (dataStructureType !== null) {
            this.importSourceParams.dataStructureType = dataStructureType;
        }
    }

    protected get showNavigation(): boolean {
        return !!this.rawPreviewResponse.sessionId || (this.importSource?.id > 0);
    }

    // ─── Save / Delete / Cancel ───

    protected onSave(): void {
        if (!this.importSource) {
            return;
        }

        this.saving = true;

        const createUpdateSource: CreateSourceSpecificationModel = {
            name: this.importSource.name,
            description: this.importSource.description,
            sourceType: SourceTypeEnum.IMPORT,
            scaleValues: this.importSource.scaleValues,
            allowMissingValue: this.importSource.allowMissingValue,
            sampleFileName: this.importSource.sampleFileName,
            utcOffset: this.importSource.utcOffset,
            parameters: this.importSource.parameters,
            disabled: this.importSource.disabled,
            comment: this.importSource.comment,
        };

        let saveSubscription: Observable<ViewSourceModel>;
        if (this.importSource.id > 0) {
            saveSubscription = this.sourcesCacheService.update(this.importSource.id, createUpdateSource);
        } else {
            saveSubscription = this.sourcesCacheService.add(createUpdateSource);
        }

        saveSubscription.pipe(take(1)).subscribe({
            next: () => {
                this.saving = false;
                this.pagesDataService.showToast({ title: 'Import specification', message: this.importSource.id > 0 ? `Import specification updated` : `Import specification created`, type: ToastEventTypeEnum.SUCCESS });
                this.closeDialog();
                this.ok.emit();
            },
            error: err => {
                this.saving = false;
                const message = err instanceof HttpErrorResponse ? err.error?.message : 'Error in saving import specification';
                this.pagesDataService.showToast({ title: 'Import specification', message: message, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
            }
        });
    }

    protected onDelete(): void {
        this.dlgDeleteConfirm.openDialog();
    }

    protected onDeleteConfirm(): void {
        this.sourcesCacheService.delete(this.importSource.id).pipe(take(1)).subscribe({
            next: () => {
                this.pagesDataService.showToast({ title: 'Import specification', message: 'Import specification deleted', type: ToastEventTypeEnum.SUCCESS });
                this.closeDialog();
                this.ok.emit();
            },
            error: err => {
                const message = err instanceof HttpErrorResponse ? err.error?.message : 'Error in deleting import specification';
                this.pagesDataService.showToast({ title: 'Import specification', message: message, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
            }
        });
    }

    protected closeDialog(): void {
        this.cleanupSession();
        this.open = false;
    }

    private resetSamplePreview(): void {
        this.rawPreviewResponse = {
            sessionId: '',
            fileName: '',
            previewData: { columns: [], rows: [], totalRowCount: 0 },
            skippedData: { columns: [], rows: [], totalRowCount: 0 },
        };

        this.transformedPreviewResponse = {
            previewData: { columns: [], rows: [], totalRowCount: 0 },
        };

        this.rawPreviewLoading = false;
        this.transformedPreviewLoading = false;
    }

    private cleanupSession(): void {
        if (this.rawPreviewResponse.sessionId) {
            this.importPreviewService.deleteSession(this.rawPreviewResponse.sessionId).pipe(take(1)).subscribe({
                error: () => { /* best effort cleanup */ }
            });
            this.rawPreviewResponse.sessionId = '';
        }
    }
}