import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationsCacheService } from '../services/stations-cache.service';
import { MetadataImportPreviewHttpService } from '../../services/metadata-import-preview-http.service';
import {
  FieldMappingModel,
  MetadataPreviewError,
  MetadataPreviewWarning,
  StationColumnMappingModel,
  StationTransformModel,
} from '../../models/metadata-import-preview.model';

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
  protected loading: boolean = false;
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
  protected sessionId: string = '';
  protected rowsToSkip: number = 1;
  protected delimiter: string = '';

  // Raw columns (for basic detail component)
  protected rawColumns: string[] = [];
  protected hasRawFile: boolean = false;

  // Column mapping — single source of truth
  protected mapping: StationColumnMappingModel = this.getDefaultMapping();

  // Preview (always shows transformed data)
  protected previewColumns: string[] = [];
  protected previewRows: string[][] = [];
  protected previewTotalRowCount: number = 0;
  protected previewRowsDropped: number = 0;
  protected previewWarnings: MetadataPreviewWarning[] = [];
  protected previewError: MetadataPreviewError | null = null;

  constructor(
    private pagesDataService: PagesDataService,
    private stationsCacheService: StationsCacheService,
    private metadataPreviewService: MetadataImportPreviewHttpService,
  ) { }

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
      this.refreshPreview();
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
    return !this.sessionId;
  }

  protected isStepValid(step: WizardStep): boolean {
    switch (step) {
      case 'upload':
        return this.hasRawFile;
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
    this.loading = true;

    this.metadataPreviewService.upload(file, this.rowsToSkip, this.delimiter || undefined).pipe(take(1)).subscribe({
      next: (response) => {
        this.sessionId = response.sessionId;
        this.rawColumns = response.columns;
        this.hasRawFile = true;
        // Show raw data as initial preview
        this.previewColumns = response.columns;
        this.previewRows = response.previewRows;
        this.previewTotalRowCount = response.totalRowCount;
        this.previewRowsDropped = 0;
        this.previewWarnings = [];
        this.previewError = null;
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
        // Update preview with raw data
        this.previewColumns = response.columns;
        this.previewRows = response.previewRows;
        this.previewTotalRowCount = response.totalRowCount;
        this.previewRowsDropped = 0;
        this.previewWarnings = [];
        this.previewError = null;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // ─── Preview ───────────────────────────────────────────────

  protected refreshPreview(): void {
    if (!this.sessionId) return;

    this.loading = true;
    this.previewError = null;
    this.previewWarnings = [];

    const transform = this.buildTransform();
    this.metadataPreviewService.previewStations(this.sessionId, transform).pipe(take(1)).subscribe({
      next: (response) => {
        this.previewColumns = response.columns;
        this.previewRows = response.previewRows;
        this.previewTotalRowCount = response.totalRowCount;
        this.previewRowsDropped = response.rowsDropped;
        this.previewWarnings = response.warnings;
        this.previewError = response.error || null;
        this.loading = false;
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'Preview Error', message: err.error?.message || 'Failed to generate preview', type: ToastEventTypeEnum.ERROR });
        this.loading = false;
      }
    });
  }

  // ─── Import ────────────────────────────────────────────────

  protected onConfirmImport(): void {
    this.importing = true;

    const transform = this.buildTransform();
    this.metadataPreviewService.confirmStationImport(this.sessionId, transform).pipe(take(1)).subscribe({
      next: () => {
        this.importing = false;
        this.open = false;
        this.sessionId = '';
        this.pagesDataService.showToast({ title: 'Stations Import', message: 'Stations imported successfully', type: ToastEventTypeEnum.SUCCESS });
        this.stationsCacheService.checkForUpdates();
        this.okClick.emit();
      },
      error: (err) => {
        this.importing = false;
        this.pagesDataService.showToast({ title: 'Import Error', message: err.error?.message || 'Failed to import stations', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onCancelClick(): void {
    this.cleanupSession();
    this.open = false;
    this.cancelClick.emit();
  }

  // ─── Private Helpers ───────────────────────────────────────

  private buildTransform(): StationTransformModel {
    return {
      rowsToSkip: this.rowsToSkip,
      delimiter: this.delimiter || undefined,
      columnMapping: {
        ...this.mapping,
        obsProcMethod: this.cleanFieldMapping(this.mapping.obsProcMethod),
        obsEnvironment: this.cleanFieldMapping(this.mapping.obsEnvironment),
        obsFocus: this.cleanFieldMapping(this.mapping.obsFocus),
        owner: this.cleanFieldMapping(this.mapping.owner),
        operator: this.cleanFieldMapping(this.mapping.operator),
        status: this.cleanFieldMapping(this.mapping.status),
      },
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
    this.loading = false;
    this.importing = false;
    this.fileName = '';
    this.sessionId = '';
    this.rowsToSkip = 1;
    this.delimiter = '';
    this.rawColumns = [];
    this.hasRawFile = false;
    this.mapping = this.getDefaultMapping();
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
