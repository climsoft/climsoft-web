import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from '../services/elements-cache.service';
import { MetadataImportPreviewHttpService } from '../../services/metadata-import-preview-http.service';
import {
  ElementColumnMappingModel,
  ElementTransformModel,
  FieldMappingModel,
  MetadataPreviewError,
  MetadataPreviewWarning,
  ValueMappingModel,
} from '../../models/metadata-import-preview.model';

type WizardStep = 'upload' | 'mapping' | 'review';

@Component({
  selector: 'app-import-elements-dialog',
  templateUrl: './import-elements-dialog.component.html',
  styleUrls: ['./import-elements-dialog.component.scss']
})
export class ImportElementsDialogComponent implements OnDestroy {
  @Output() public okClick = new EventEmitter<void>();
  @Output() public cancelClick = new EventEmitter<void>();

  protected open: boolean = false;
  protected currentStep: WizardStep = 'upload';
  protected loading: boolean = false;
  protected importing: boolean = false;

  // Upload step
  protected fileName: string = '';
  protected sessionId: string = '';
  protected rowsToSkip: number = 1;
  protected delimiter: string = '';

  // Raw preview
  protected rawColumns: string[] = [];
  protected rawRows: string[][] = [];
  protected rawTotalRowCount: number = 0;
  protected rawSkippedRows: string[][] = [];

  // Column mapping
  protected mapping: ElementColumnMappingModel = this.getDefaultMapping();

  // Value mapping fields
  protected elementTypeMapping: FieldMappingModel = {};

  // Transform preview
  protected previewColumns: string[] = [];
  protected previewRows: string[][] = [];
  protected previewTotalRowCount: number = 0;
  protected previewRowsDropped: number = 0;
  protected previewWarnings: MetadataPreviewWarning[] = [];
  protected previewError: MetadataPreviewError | null = null;

  protected hasRawFile: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private elementsCacheService: ElementsCacheService,
    private metadataPreviewService: MetadataImportPreviewHttpService,
  ) { }

  ngOnDestroy(): void {
    this.cleanupSession();
  }

  public showDialog(): void {
    this.reset();
    this.open = true;
  }

  protected get isUploadStep(): boolean { return this.currentStep === 'upload'; }
  protected get isMappingStep(): boolean { return this.currentStep === 'mapping'; }
  protected get isReviewStep(): boolean { return this.currentStep === 'review'; }

  protected get canGoNext(): boolean {
    if (this.loading || this.importing) return false;
    if (this.currentStep === 'upload') return this.hasRawFile;
    if (this.currentStep === 'mapping') {
      return this.mapping.idColumnPosition > 0
        && this.mapping.abbreviationColumnPosition > 0
        && this.mapping.nameColumnPosition > 0;
    }
    return false;
  }

  protected get canGoBack(): boolean {
    return !this.loading && !this.importing && this.currentStep !== 'upload';
  }

  protected onFileSelected(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file: File = files[0];
    this.fileName = file.name;
    this.loading = true;

    this.metadataPreviewService.upload(file, this.rowsToSkip, this.delimiter || undefined).pipe(take(1)).subscribe({
      next: (response) => {
        this.sessionId = response.sessionId;
        this.rawColumns = response.columns;
        this.rawRows = response.previewRows;
        this.rawTotalRowCount = response.totalRowCount;
        this.rawSkippedRows = response.skippedRows;
        this.hasRawFile = true;
        this.loading = false;
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'Upload Error', message: err.error?.message || 'Failed to upload file', type: ToastEventTypeEnum.ERROR });
        this.loading = false;
      }
    });
  }

  protected onRowsToSkipChange(): void {
    if (!this.sessionId) return;
    this.loading = true;
    this.metadataPreviewService.updateBaseParams(this.sessionId, this.rowsToSkip, this.delimiter || undefined).pipe(take(1)).subscribe({
      next: (response) => {
        this.rawColumns = response.columns;
        this.rawRows = response.previewRows;
        this.rawTotalRowCount = response.totalRowCount;
        this.rawSkippedRows = response.skippedRows;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  protected onNext(): void {
    if (this.currentStep === 'upload') {
      this.currentStep = 'mapping';
    } else if (this.currentStep === 'mapping') {
      this.refreshPreview();
    }
  }

  protected onBack(): void {
    if (this.currentStep === 'review') {
      this.currentStep = 'mapping';
    } else if (this.currentStep === 'mapping') {
      this.currentStep = 'upload';
    }
  }

  private refreshPreview(): void {
    this.loading = true;
    this.previewError = null;
    this.previewWarnings = [];

    this.buildMappingFromFieldMappings();

    const transform = this.buildTransform();
    this.metadataPreviewService.previewElements(this.sessionId, transform).pipe(take(1)).subscribe({
      next: (response) => {
        this.previewColumns = response.columns;
        this.previewRows = response.previewRows;
        this.previewTotalRowCount = response.totalRowCount;
        this.previewRowsDropped = response.rowsDropped;
        this.previewWarnings = response.warnings;
        this.previewError = response.error || null;
        this.currentStep = 'review';
        this.loading = false;
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'Preview Error', message: err.error?.message || 'Failed to generate preview', type: ToastEventTypeEnum.ERROR });
        this.loading = false;
      }
    });
  }

  protected onConfirmImport(): void {
    this.importing = true;

    this.buildMappingFromFieldMappings();

    const transform = this.buildTransform();
    this.metadataPreviewService.confirmElementImport(this.sessionId, transform).pipe(take(1)).subscribe({
      next: () => {
        this.importing = false;
        this.open = false;
        this.sessionId = '';
        this.pagesDataService.showToast({ title: 'Elements Import', message: 'Elements imported successfully', type: ToastEventTypeEnum.SUCCESS });
        this.elementsCacheService.checkForUpdates();
        this.okClick.emit();
      },
      error: (err) => {
        this.importing = false;
        this.pagesDataService.showToast({ title: 'Import Error', message: err.error?.message || 'Failed to import elements', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onCancelClick(): void {
    this.cleanupSession();
    this.open = false;
    this.cancelClick.emit();
  }

  protected addValueMapping(mappings: ValueMappingModel[]): void {
    mappings.push({ sourceId: '', databaseId: '' });
  }

  protected removeValueMapping(mappings: ValueMappingModel[], index: number): void {
    mappings.splice(index, 1);
  }

  protected initValueMappings(fm: FieldMappingModel): void {
    if (!fm.valueMappings) {
      fm.valueMappings = [];
    }
  }

  // ─── Private Helpers ───────────────────────────────────────

  private buildMappingFromFieldMappings(): void {
    this.mapping.elementType = this.buildFieldMapping(this.elementTypeMapping);
  }

  private buildFieldMapping(fm: FieldMappingModel): FieldMappingModel | undefined {
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

  private buildTransform(): ElementTransformModel {
    return {
      rowsToSkip: this.rowsToSkip,
      delimiter: this.delimiter || undefined,
      columnMapping: this.mapping,
    };
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
    this.currentStep = 'upload';
    this.loading = false;
    this.importing = false;
    this.fileName = '';
    this.sessionId = '';
    this.rowsToSkip = 1;
    this.delimiter = '';
    this.rawColumns = [];
    this.rawRows = [];
    this.rawTotalRowCount = 0;
    this.rawSkippedRows = [];
    this.hasRawFile = false;
    this.mapping = this.getDefaultMapping();
    this.elementTypeMapping = {};
    this.previewColumns = [];
    this.previewRows = [];
    this.previewTotalRowCount = 0;
    this.previewRowsDropped = 0;
    this.previewWarnings = [];
    this.previewError = null;
  }

  private cleanupSession(): void {
    if (this.sessionId) {
      this.metadataPreviewService.deleteSession(this.sessionId).pipe(take(1)).subscribe();
      this.sessionId = '';
    }
  }
}
