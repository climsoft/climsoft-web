import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationsCacheService } from '../services/stations-cache.service';
import { MetadataImportPreviewService } from '../../services/metadata-import-preview.service';
import {
  FieldMappingModel,
  StationColumnMappingModel,
} from '../../models/metadata-import-preview.model';
import { RawPreviewResponse, TransformedPreviewResponse } from '../../source-specifications/models/import-preview.model';

type WizardStep = 'upload' | 'basic' | 'obs-proc-method' | 'obs-environment' | 'obs-focus' | 'owner-operator' | 'status' | 'external-ids' | 'dates' | 'comment' | 'review';

@Component({
  selector: 'app-stations-import-dialog',
  templateUrl: './stations-import-dialog.component.html',
  styleUrls: ['./stations-import-dialog.component.scss']
})
export class StationsImportDialogComponent implements OnDestroy {
  @Output() public okClick = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open: boolean = false;
  protected activeStep: WizardStep = 'upload';
  protected importing: boolean = false;

  protected readonly wizardSteps: WizardStep[] = [
    'upload', 'basic', 'obs-proc-method', 'obs-environment', 'obs-focus',
    'owner-operator', 'status', 'external-ids', 'dates', 'comment', 'review'
  ];

  protected readonly stepLabels: Record<WizardStep, string> = {
    'upload': 'Upload',
    'basic': 'Basic Info',
    'obs-proc-method': 'Obs Method',
    'obs-environment': 'Environment',
    'obs-focus': 'Obs Focus',
    'owner-operator': 'Owner & Operator',
    'status': 'Status',
    'external-ids': 'External IDs',
    'dates': 'Dates',
    'comment': 'Comment',
    'review': 'Review',
  };

  protected visitedSteps: Set<WizardStep> = new Set(['upload']);

  // Upload step
  protected fileName: string = '';
  protected rowsToSkip: number = 1;
  protected delimiter: string | undefined;

  // Column mapping — single source of truth
  protected mapping: StationColumnMappingModel = this.getDefaultMapping();

  // File Preview state
  protected rawPreviewResponse!: RawPreviewResponse;
  protected transformedPreviewResponse!: TransformedPreviewResponse;
  protected rawPreviewLoading: boolean = false;
  protected transformedPreviewLoading: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService,
    private metadataPreviewService: MetadataImportPreviewService,
  ) {
    this.resetPreviews();
  }

  ngOnDestroy(): void {
    this.cleanupSession();
  }

  public showDialog(): void {
    this.reset();
    this.open = true;
  }

  // ─── Wizard Navigation ─────────────────────────────────────

  protected onStepTabClick(step: WizardStep): void {
    if (this.isStepDisabled(step)) return;
    this.activeStep = step;
    this.visitedSteps.add(step);
    this.refreshPreview();
  }

  protected onNext(): void {
    const idx = this.wizardSteps.indexOf(this.activeStep);
    if (idx < this.wizardSteps.length - 1) {
      this.activeStep = this.wizardSteps[idx + 1];
      this.visitedSteps.add(this.activeStep);
      if (this.rawPreviewResponse.sessionId) {
        this.refreshPreview();
      }
    }
  }

  protected onPrevious(): void {
    const idx = this.wizardSteps.indexOf(this.activeStep);
    if (idx > 0) {
      this.activeStep = this.wizardSteps[idx - 1];
      this.visitedSteps.add(this.activeStep);
      this.refreshPreview();
    }
  }

  protected isStepDisabled(step: WizardStep): boolean {
    if (step === 'upload') return false;
    return !this.rawPreviewResponse.sessionId;
  }

  protected isStepValid(step: WizardStep): boolean {
    switch (step) {
      case 'upload':
        return !!this.rawPreviewResponse.sessionId;
      case 'basic':
        return this.mapping.idColumnPosition > 0 && this.mapping.nameColumnPosition > 0;
      default:
        return true;
    }
  }

  protected hasStepBeenVisited(step: WizardStep): boolean {
    return this.visitedSteps.has(step);
  }

  protected getStepNumber(step: WizardStep): number {
    return this.wizardSteps.indexOf(step) + 1;
  }

  // ─── Upload ────────────────────────────────────────────────

  protected onFileSelected(file: File): void {
    this.fileName = file.name;
    this.rawPreviewLoading = true;
    this.transformedPreviewLoading = true;
    this.transformedPreviewResponse.error = undefined;

    this.metadataPreviewService.upload(file, this.rowsToSkip, this.delimiter || undefined).pipe(take(1)).subscribe({
      next: (response: RawPreviewResponse) => {
        this.rawPreviewLoading = false;
        this.transformedPreviewLoading = false;
        this.rawPreviewResponse = response;
        this.transformedPreviewResponse = { previewData: response.previewData };
      },
      error: (err) => {
        this.rawPreviewLoading = false;
        this.transformedPreviewLoading = false;
        this.pagesDataService.showToast({ title: 'Upload Error', message: err.error?.message || 'Failed to upload file', type: ToastEventTypeEnum.ERROR, timeout: 8000 });
        console.error('Preview upload error:', err);
      }
    });
  }

  protected onRowsToSkipChange(): void {
    this.reLoadRawPreview();
  }

  // ─── Preview ───────────────────────────────────────────────

  protected refreshPreview(): void {
    if (!this.rawPreviewResponse.sessionId) return;

    if (this.activeStep === 'upload') {
      this.reLoadRawPreview();
      return;
    }

    if (this.transformedPreviewLoading) {
      return;
    }

    this.transformedPreviewLoading = true;

    const transform = this.buildTransform();
    this.metadataPreviewService.previewStations(this.rawPreviewResponse.sessionId, transform).pipe(take(1)).subscribe({
      next: (response: TransformedPreviewResponse) => {
        this.transformedPreviewLoading = false;
        this.transformedPreviewResponse = response;
      },
      error: (err) => {
        this.transformedPreviewLoading = false;
        const message = err.error?.message || 'Failed to generate preview';
        this.transformedPreviewResponse.error = { type: 'SQL_EXECUTION_ERROR', message };
      }
    });
  }

  private reLoadRawPreview(): void {
    if (!this.rawPreviewResponse.sessionId) return;

    if (this.rawPreviewLoading && this.transformedPreviewLoading) {
      return;
    }

    this.rawPreviewLoading = true;
    this.transformedPreviewLoading = true;
    this.transformedPreviewResponse.error = undefined;

    this.metadataPreviewService.updateBaseParams(this.rawPreviewResponse.sessionId, this.rowsToSkip, this.delimiter || undefined).pipe(take(1)).subscribe({
      next: (response: RawPreviewResponse) => {
        this.rawPreviewLoading = false;
        this.transformedPreviewLoading = false;
        this.rawPreviewResponse = response;
        this.transformedPreviewResponse = { previewData: response.previewData };
      },
      error: (err) => {
        this.rawPreviewLoading = false;
        this.transformedPreviewLoading = false;
        const message = err.error?.message || 'Failed to load raw preview.';
        this.transformedPreviewResponse.error = { type: 'SQL_EXECUTION_ERROR', message };
      }
    });
  }

  // ─── Import ────────────────────────────────────────────────

  protected onConfirmImport(): void {
    this.importing = true;

    const transform = this.buildTransform();
    this.metadataPreviewService.confirmStationImport(this.rawPreviewResponse.sessionId, transform).pipe(take(1)).subscribe({
      next: () => {
        this.importing = false;
        this.open = false;
        this.rawPreviewResponse.sessionId = '';
        this.pagesDataService.showToast({ title: 'Stations Import', message: 'Stations imported successfully', type: ToastEventTypeEnum.SUCCESS });
        this.stationsCacheService.checkForUpdates();
        this.okClick.emit();
      },
      error: (err) => {
        this.importing = false;
        this.pagesDataService.showToast({ title: 'Import Error', message: err.error?.message || 'Failed to import stations', type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });
  }

  protected onCancelClick(): void {
    this.cleanupSession();
    this.open = false;
    this.cancelClick.emit();
  }

  // ─── Private Helpers ───────────────────────────────────────

  private buildTransform(): StationColumnMappingModel {
    return {
      ...this.mapping,
      obsProcMethod: this.cleanFieldMapping(this.mapping.obsProcMethod),
      obsEnvironment: this.cleanFieldMapping(this.mapping.obsEnvironment),
      obsFocus: this.cleanFieldMapping(this.mapping.obsFocus),
      owner: this.cleanFieldMapping(this.mapping.owner),
      operator: this.cleanFieldMapping(this.mapping.operator),
      status: this.cleanFieldMapping(this.mapping.status),
    }
  }

  private cleanFieldMapping(fm: FieldMappingModel | undefined): FieldMappingModel | undefined {
    if (!fm) return undefined;

    if (fm.columnPosition && fm.columnPosition > 0) {
      const result: FieldMappingModel = { columnPosition: fm.columnPosition };
      if (fm.valueMappings && fm.valueMappings.length > 0) {
        result.valueMappings = fm.valueMappings.filter(m => m.sourceId && m.databaseId);
      }
      return result;
    }
    if (fm.defaultValue !== undefined && fm.defaultValue !== '') {
      return { defaultValue: fm.defaultValue };
    }
    return undefined;
  }

  private getDefaultMapping(): StationColumnMappingModel {
    return {
      idColumnPosition: 1,
      nameColumnPosition: 2,
    };
  }

  private reset(): void {
    this.cleanupSession();
    this.activeStep = 'upload';
    this.visitedSteps = new Set(['upload']);
    this.importing = false;
    this.fileName = '';
    this.rowsToSkip = 1;
    this.delimiter = undefined;
    this.mapping = this.getDefaultMapping();
    this.resetPreviews();
  }

  private resetPreviews(): void {
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
      this.metadataPreviewService.deleteSession(this.rawPreviewResponse.sessionId).pipe(take(1)).subscribe();
      this.rawPreviewResponse.sessionId = '';
    }
  }
}
