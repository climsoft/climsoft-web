import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { ImportSourceTabularParamsModel } from '../models/import-source-tabular-params.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { CreateSourceSpecificationModel } from 'src/app/metadata/source-specifications/models/create-source-specification.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { SourcesCacheService } from '../services/source-cache.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ImportPreviewHttpService } from './services/import-preview.service';
import { PreviewError, PreviewWarning } from '../models/import-preview.model';

type WizardStep = 'upload' | 'station' | 'element' | 'datetime' | 'value' | 'review';

@Component({
    selector: 'app-import-source-detail',
    templateUrl: './import-source-detail.component.html',
    styleUrls: ['./import-source-detail.component.scss']
})
export class ImportSourceDetailComponent implements OnDestroy {
    @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;

    @Output()
    public ok = new EventEmitter<void>();

    protected open: boolean = false;
    protected title: string = '';
    protected importSource!: ViewSourceModel;
    protected errorMessage: string = '';

    // Wizard state
    protected activeStep: WizardStep = 'upload';
    protected readonly wizardSteps: WizardStep[] = ['upload', 'station', 'element', 'datetime', 'value', 'review'];
    protected readonly stepLabels: Record<WizardStep, string> = {
        upload: 'File & Basics',
        station: 'Station',
        element: 'Elements',
        datetime: 'Date & Time',
        value: 'Value & More',
        review: 'Review',
    };

    // Preview state
    protected sessionId: string | null = null;
    protected previewColumns: string[] = [];
    protected previewRows: string[][] = [];
    protected skippedRows: string[][] = [];
    protected totalRowCount: number = 0;
    protected rowsDropped: number = 0;
    protected warnings: PreviewWarning[] = [];
    protected errors: PreviewError[] = [];
    protected previewLoading: boolean = false;
    protected uploadedFileName: string = '';

    private destroy$ = new Subject<void>();

    constructor(
        private pagesDataService: PagesDataService,
        private importSourcesService: SourcesCacheService,
        private importPreviewService: ImportPreviewHttpService,
    ) { }

    public openDialog(sourceId?: number): void {
        // Reset all state
        this.cleanupSession();
        this.errorMessage = '';
        this.activeStep = 'upload';
        this.previewColumns = [];
        this.previewRows = [];
        this.skippedRows = [];
        this.totalRowCount = 0;
        this.rowsDropped = 0;
        this.warnings = [];
        this.errors = [];
        this.previewLoading = false;
        this.uploadedFileName = '';

        this.open = true;

        if (sourceId) {
            this.title = 'Edit Import Specification';

            this.importSourcesService.findOne(sourceId).pipe(
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
                intervalDefinition: {
                    defaultInterval: 1440
                },
                levelColumnPosition: undefined,
                datetimeDefinition: {
                    dateTimeInSingleColumn: {
                        columnPosition: 0,
                        datetimeFormat: '%Y-%m-%d %H:%M',
                    }
                },
                valueDefinition: {
                    valueColumnPosition: 0,
                },
            };

            const defaultImportSourceDefs: ImportSourceModel = {
                dataStructureType: DataStructureTypeEnum.TABULAR,
                sourceMissingValueFlags: '',
                dataStructureParameters: defaultTabularDefs,
                isValid: () => true
            };

            this.importSource = {
                id: 0,
                name: '',
                description: '',
                sourceType: SourceTypeEnum.IMPORT,
                allowMissingValue: false,
                sampleFile: '',
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
        this.refreshPreview();
    }

    protected onNext(): void {
        const currentIndex = this.wizardSteps.indexOf(this.activeStep);
        if (currentIndex < this.wizardSteps.length - 1) {
            this.activeStep = this.wizardSteps[currentIndex + 1];
            if (this.sessionId) {
                this.refreshPreview();
            }
        }
    }

    protected onPrevious(): void {
        const currentIndex = this.wizardSteps.indexOf(this.activeStep);
        if (currentIndex > 0) {
            this.activeStep = this.wizardSteps[currentIndex - 1];
            this.refreshPreview();
        }
    }

    protected isStepDisabled(step: WizardStep): boolean {
        return step !== 'upload' && !this.sessionId;
    }

    // ─── File Upload ───

    protected onFileSelected(fileInputEvent: any): void {
        if (fileInputEvent.target.files.length === 0) {
            return;
        }

        const file = fileInputEvent.target.files[0] as File;
        this.uploadedFileName = file.name;

        this.previewLoading = true;
        this.warnings = [];
        this.errors = [];

        this.importPreviewService.upload(
            file,
            this.tabularImportParams.rowsToSkip,
            this.tabularImportParams.delimiter,
        ).pipe(take(1)).subscribe({
            next: (res) => {
                this.previewLoading = false;
                this.sessionId = res.sessionId;
                this.importSource.sampleFile = res.sampleFile;
                this.previewColumns = res.columns;
                this.previewRows = res.previewRows;
                this.skippedRows = res.skippedRows;
                this.totalRowCount = res.totalRowCount;
                this.rowsDropped = 0;
            },
            error: (err) => {
                this.previewLoading = false;
                const message = err instanceof HttpErrorResponse ? err.error?.message : 'Failed to upload file.';
                this.errors = [{ type: 'SQL_EXECUTION_ERROR', message }];
                console.error('Preview upload error:', err);
            }
        });

        // Reset file input so re-selecting same file triggers change
        fileInputEvent.target.value = null;
    }

    // ─── Preview ───

    protected refreshPreview(): void {
        if (!this.sessionId) return;

        // If we're on the initial upload step, always refresh the raw preview without re-processing the file
        // Important when user needs to see the original preview even after changing parameters in the later steps
        if (this.activeStep === 'upload') {
            this.loadRawPreview();
            return;
        }

        this.previewLoading = true;
        this.warnings = [];
        this.errors = [];

        const sourceDefinition: CreateSourceSpecificationModel = {
            name: this.importSource.name,
            description: this.importSource.description,
            sourceType: SourceTypeEnum.IMPORT,
            scaleValues: this.importSource.scaleValues,
            allowMissingValue: this.importSource.allowMissingValue,
            sampleFile: this.importSource.sampleFile,
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

        this.importPreviewService.previewStep(
            this.sessionId,
            sourceDefinition,
            stationId,
        ).pipe(take(1)).subscribe({
            next: (res) => {
                this.previewLoading = false;
                this.previewColumns = res.columns;
                this.previewRows = res.previewRows;
                this.totalRowCount = res.totalRowCount;
                this.rowsDropped = res.rowsDropped;
                this.warnings = res.warnings;
                this.errors = res.errors;
            },
            error: (err) => {
                this.previewLoading = false;
                const message = err instanceof HttpErrorResponse ? err.error?.message : 'Failed to generate preview.';
                this.errors = [{ type: 'SQL_EXECUTION_ERROR', message }];
                console.error('Preview step error:', err);
            }
        });
    }

    private loadRawPreview(): void {
        if (!this.sessionId) return;

        this.previewLoading = true;
        this.warnings = [];
        this.errors = [];

        this.importPreviewService.updateBaseParams(
            this.sessionId,
            this.tabularImportParams.rowsToSkip,
            this.tabularImportParams.delimiter,
        ).pipe(take(1)).subscribe({
            next: (res) => {
                this.previewLoading = false;
                this.previewColumns = res.columns;
                this.previewRows = res.previewRows;
                this.skippedRows = res.skippedRows;
                this.totalRowCount = res.totalRowCount;
                this.rowsDropped = 0;
            },
            error: (err) => {
                this.previewLoading = false;
                const message = err instanceof HttpErrorResponse ? err.error?.message : 'Failed to load raw preview.';
                this.errors = [{ type: 'SQL_EXECUTION_ERROR', message }];
                console.error('Raw preview error:', err);
            }
        });
    }

    // ─── Element / DateTime change handler ───

    protected onElementOrDatetimeDefChanged(): void {
        const sourceParameters = this.importSourceParams.dataStructureParameters as ImportSourceTabularParamsModel;
        if (sourceParameters.elementDefinition.hasElement && sourceParameters.elementDefinition.hasElement.multipleColumn) {
            sourceParameters.valueDefinition = undefined;
        } else if (sourceParameters.datetimeDefinition.dateTimeInMultipleColumns) {
            const dateTimeInMultiDef = sourceParameters.datetimeDefinition.dateTimeInMultipleColumns;
            const dayColumns: string[] = dateTimeInMultiDef.dayColumnPosition.split('-');
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

    // ─── Save / Delete / Cancel ───

    protected onSave(): void {
        this.errorMessage = '';

        if (!this.importSource) {
            this.errorMessage = 'Template not defined';
            return;
        }

        if (!this.importSource.name) {
            this.errorMessage = 'Enter template name';
            return;
        }

        if (!this.importSource.description) {
            this.errorMessage = 'Enter template description';
            return;
        }

        const createUpdateSource: CreateSourceSpecificationModel = {
            name: this.importSource.name,
            description: this.importSource.description,
            sourceType: SourceTypeEnum.IMPORT,
            scaleValues: this.importSource.scaleValues,
            allowMissingValue: this.importSource.allowMissingValue,
            sampleFile: this.importSource.sampleFile,
            utcOffset: this.importSource.utcOffset,
            parameters: this.importSource.parameters,
            disabled: this.importSource.disabled,
            comment: this.importSource.comment,
        };

        let saveSubscription: Observable<ViewSourceModel>;
        if (this.importSource.id > 0) {
            saveSubscription = this.importSourcesService.update(this.importSource.id, createUpdateSource);
        } else {
            saveSubscription = this.importSourcesService.add(createUpdateSource);
        }

        saveSubscription.pipe(
            take(1)
        ).subscribe({
            next: () => {
                this.pagesDataService.showToast({ title: 'Import Template', message: this.importSource.id > 0 ? `Import template updated` : `Import template created`, type: ToastEventTypeEnum.SUCCESS });
                this.closeDialog();
                this.ok.emit();
            },
            error: err => {
                if (err instanceof HttpErrorResponse) {
                    this.pagesDataService.showToast({ title: 'Import Template', message: `Error in saving import template - ${err.error.message}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
                }
            }
        });
    }

    protected onDelete(): void {
        this.dlgDeleteConfirm.showDialog();
    }

    protected onDeleteConfirm(): void {
        this.importSourcesService.delete(this.importSource.id).pipe(
            take(1)
        ).subscribe({
            next: () => {
                this.pagesDataService.showToast({ title: 'Import Template', message: 'Import template deleted', type: ToastEventTypeEnum.SUCCESS });
                this.closeDialog();
                this.ok.emit();
            },
            error: err => {
                this.pagesDataService.showToast({ title: 'Import Template', message: `Error in deleting import template - ${err.error.message}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
            }
        });
    }

    protected closeDialog(): void {
        this.cleanupSession();
        this.open = false;
    }

    private initPreviewFromSavedFile(): void {
        if (!this.importSource.sampleFile) return;

        this.previewLoading = true;

        this.importPreviewService.initFromFile(
            this.importSource.sampleFile,
            this.tabularImportParams.rowsToSkip,
            this.tabularImportParams.delimiter,
        ).pipe(take(1)).subscribe({
            next: (res) => {
                this.previewLoading = false;
                this.sessionId = res.sessionId;
                this.uploadedFileName = res.sampleFile;
                this.previewColumns = res.columns;
                this.previewRows = res.previewRows;
                this.skippedRows = res.skippedRows;
                this.totalRowCount = res.totalRowCount;
                this.rowsDropped = 0;
            },
            error: () => {
                // File no longer exists on server — silently fall back to "upload a sample file" prompt
                this.previewLoading = false;
            }
        });
    }

    private cleanupSession(): void {
        if (this.sessionId) {
            this.importPreviewService.deleteSession(this.sessionId).pipe(take(1)).subscribe({
                error: () => { /* best effort cleanup */ }
            });
            this.sessionId = null;
        }
    }
}
