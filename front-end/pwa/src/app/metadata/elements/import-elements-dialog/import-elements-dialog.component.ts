import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from '../services/elements-cache.service';
import { MetadataImportPreviewService } from '../../services/metadata-import-preview.service';
import {
  ElementColumnMappingModel,
  FieldMappingModel,
} from '../../models/metadata-import-preview.model';
import { RawPreviewResponse, TransformedPreviewResponse } from '../../source-specifications/models/import-preview.model';

type WizardStep = 'upload' | 'basic' | 'element-type' | 'extras' | 'review';

@Component({
  selector: 'app-import-elements-dialog',
  templateUrl: './import-elements-dialog.component.html',
  styleUrls: ['./import-elements-dialog.component.scss']
})
export class ImportElementsDialogComponent implements OnDestroy {
  @Output() public okClick = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open: boolean = false;
  protected activeStep: WizardStep = 'upload';
  protected importing: boolean = false;

  protected readonly wizardSteps: WizardStep[] = [
    'upload', 'basic', 'element-type', 'extras', 'review'
  ];

  protected readonly stepLabels: Record<WizardStep, string> = {
    'upload': 'Upload',
    'basic': 'Basic Info',
    'element-type': 'Element Type',
    'extras': 'Extras',
    'review': 'Review',
  };

  protected visitedSteps: Set<WizardStep> = new Set(['upload']);

  // Upload step
  protected fileName: string = '';
  protected rowsToSkip: number = 1;
  protected delimiter: string | undefined;

  // Column mapping — single source of truth
  protected mapping: ElementColumnMappingModel = this.getDefaultMapping();

  // File Preview state
  protected rawPreviewResponse!: RawPreviewResponse;
  protected transformedPreviewResponse!: TransformedPreviewResponse;
  protected rawPreviewLoading: boolean = false;
  protected transformedPreviewLoading: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private elementsCacheService: ElementsCacheService,
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
        return this.mapping.idColumnPosition > 0
          && this.mapping.abbreviationColumnPosition > 0
          && this.mapping.nameColumnPosition > 0;
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
        this.pagesDataService.showToast({ title: 'Upload Error', message: err.error?.message || 'Failed to upload file', type: ToastEventTypeEnum.ERROR });
        console.error('Preview upload error:', err);
      }
    });
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
    this.metadataPreviewService.previewElements(this.rawPreviewResponse.sessionId, transform).pipe(take(1)).subscribe({
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

  protected reLoadRawPreview(): void {
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
    this.metadataPreviewService.confirmElementImport(this.rawPreviewResponse.sessionId, transform).pipe(take(1)).subscribe({
      next: () => {
        this.importing = false;
        this.open = false;
        this.rawPreviewResponse.sessionId = '';
        this.pagesDataService.showToast({ title: 'Elements Import', message: 'Elements imported successfully', type: ToastEventTypeEnum.SUCCESS });
        this.elementsCacheService.checkForUpdates();
        this.okClick.emit();
      },
      error: (err) => {
        this.importing = false;
        this.pagesDataService.showToast({ title: 'Import Error', message: err.error?.message || 'Failed to import elements', type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });
  }

  protected onCancelClick(): void {
    this.cleanupSession();
    this.open = false;
    this.cancelClick.emit();
  }

  // ─── Private Helpers ───────────────────────────────────────

  private buildTransform(): ElementColumnMappingModel {
    return {
      ...this.mapping,
      elementType: this.cleanFieldMapping(this.mapping.elementType),
    };
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

  private getDefaultMapping(): ElementColumnMappingModel {
    return {
      idColumnPosition: 1,
      abbreviationColumnPosition: 2,
      nameColumnPosition: 3,
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
