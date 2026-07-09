import { Component, OnDestroy } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { ImportSourceTabularParamsModel } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { ViewSourceSpecificationModel } from 'src/app/metadata/source-specifications/models/view-source-specification.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { ImportPreviewService } from 'src/app/metadata/source-specifications/services/import-preview.service';
import { PreviewForSourceResponse, RawPreviewResponse, TransformedPreviewResponse, PreviewError } from 'src/app/metadata/source-specifications/models/import-preview.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';

enum ImportStage {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PREVIEWING = 'previewing',
  IMPORTING = 'importing',
  SUCCESS = 'success',
  ERROR = 'error'
}

@Component({
  selector: 'app-import-entry',
  templateUrl: './import-entry.component.html',
  styleUrls: ['./import-entry.component.scss']
})
export class ImportEntryDialogComponent implements OnDestroy {
  protected open: boolean = false;
  protected title: string = '';
  protected viewSource!: ViewSourceSpecificationModel;

  // file preview from the saved specification (sample file)
  protected sampleFileRawPreviewResponse!: RawPreviewResponse;
  protected sampleFileLoading: boolean = false;

  // file preview from uploaded file
  protected uploadedFileRawPreviewResponse!: RawPreviewResponse;
  protected uploadedFileTransformedPreviewResponse!: TransformedPreviewResponse;
  protected uploadError: PreviewError | null = null;
  protected uploadingFile: boolean = false;
  protected processingFile: boolean = false;

  // Import state
  protected importStage: ImportStage = ImportStage.IDLE;
  protected readonly ImportStage = ImportStage;
  protected importMessage: string = '';
  protected enableConfirmImport: boolean = false;

  protected showStationSelection: boolean = false;
  protected selectedStationId!: string | null;
  protected onlyIncludeStationIds: string[] = [];

  protected selectedFileName: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private importPreviewService: ImportPreviewService,
    private pagesDataService: PagesDataService,
  ) {
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      if (user.isSystemAdmin) {
        this.onlyIncludeStationIds = [];
      } else if (user.permissions && user.permissions.entryPermissions) {
        if (user.permissions.entryPermissions.stationIds) {
          this.onlyIncludeStationIds = user.permissions.entryPermissions.stationIds;
        } else {
          this.onlyIncludeStationIds = [];
        }
      } else {
        throw new Error('Data entry not allowed');
      }
    });

    // Reset all state
    this.resetSamplePreview();
    this.resetUploadPreview();
  }

  public openDialog(source: ViewSourceSpecificationModel): void {
    this.viewSource = source;
    this.title = `Import Data From ${source.name}`;

    // Reset all state
    this.selectedFileName = '';
    this.resetSamplePreview();
    this.resetUploadPreview();
    this.importStage = ImportStage.IDLE;
    this.importMessage = '';
    this.enableConfirmImport = false;
    this.selectedStationId = null;

    const importSource: ImportSourceModel = this.viewSource.parameters as ImportSourceModel;
    if (importSource.dataStructureType === DataStructureTypeEnum.TABULAR) {
      const tabularSource: ImportSourceTabularParamsModel = importSource.dataStructureParameters as ImportSourceTabularParamsModel;
      this.showStationSelection = !tabularSource.stationDefinition;
    } else {
      this.showStationSelection = false;
    }

    this.open = true;

    // Load sample file preview if available
    if (this.viewSource.sampleFileName) {
      this.loadSampleFilePreview();
    }
  }

  ngOnDestroy(): void {
    this.cleanupSession();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSampleFilePreview(): void {
    this.sampleFileLoading = true;

    this.importPreviewService.previewSampleForSource(this.viewSource.id).pipe(
      take(1),
    ).subscribe({
      next: (response: PreviewForSourceResponse | null) => {
        // The server already tore down the session for sample-file previews.
        // Populate a sentinel `sessionId` so the template's `hasFile` check
        // still flips true.
        if (response) {
          this.sampleFileRawPreviewResponse = { ...response.raw, sessionId: response.raw.sessionId || 'sample' };
        }
        this.sampleFileLoading = false;
      },
      error: () => {
        this.sampleFileLoading = false;
      }
    });
  }

  protected get canUploadFile(): boolean {  
    return !(this. uploadingFile || this.processingFile || (this.showStationSelection && !this.selectedStationId));
  }

  protected onFileSelected(file: File): void {
    if (this.showStationSelection && !this.selectedStationId) {
      this.importStage = ImportStage.ERROR;
      this.importMessage = 'Please select a station first';
      return;
    }

    this.selectedFileName = file.name;

    // Clean up any existing session
    this.cleanupSession();
    this.resetUploadPreview();

    this.importStage = ImportStage.UPLOADING;
    this.importMessage = 'Uploading file...';
    this.uploadingFile = true;
    this.processingFile = true;

    // Single round trip: server applies the spec's base params, runs the
    // adapter (if any), and returns both raw + transformed previews.
    this.importPreviewService.uploadForSource(file, this.viewSource.id, this.selectedStationId || undefined).pipe(
      take(1),
    ).subscribe({
      next: (response: PreviewForSourceResponse) => {
        this.uploadingFile = false;
        this.processingFile = false;

        this.uploadedFileRawPreviewResponse = response.raw;
        this.uploadedFileTransformedPreviewResponse = response.transformed;
        this.uploadError = response.transformed.error || null;

        if (response.transformed.error) {
          this.importStage = ImportStage.ERROR;
          this.importMessage = 'Preview completed with errors. Please fix the issues and try again.';
          this.pagesDataService.showToast({ title: 'File Import', message: this.importMessage, type: ToastEventTypeEnum.ERROR })
        } else {
          this.importStage = ImportStage.IDLE;
          this.importMessage = 'File ready for import. Click Confirm Import button to import the file.';
          this.enableConfirmImport = true;
          this.pagesDataService.showToast({ title: 'File Import', message: this.importMessage, type: ToastEventTypeEnum.INFO })
        }
      },
      error: (err) => {
        console.error(err)
        this.uploadingFile = false;
        this.processingFile = false;
        this.importStage = ImportStage.ERROR;
        this.importMessage = err.error?.message || 'Failed to process file. Please try again.';
        this.pagesDataService.showToast({ title: 'File Import', message: this.importMessage, type: ToastEventTypeEnum.ERROR })
      }
    });
  }

  private resetSamplePreview(): void {
    this.sampleFileRawPreviewResponse = {
      sessionId: '',
      fileName: '',
      previewData: { columns: [], rows: [], totalRowCount: 0 },
      skippedData: { columns: [], rows: [], totalRowCount: 0 },
      originalLines: [],
    };

    this.sampleFileLoading = false;
  }

  private resetUploadPreview(): void {
    this.uploadedFileRawPreviewResponse = {
      sessionId: '',
      fileName: '',
      previewData: { columns: [], rows: [], totalRowCount: 0 },
      skippedData: { columns: [], rows: [], totalRowCount: 0 },
      originalLines: [],
    };
    this.uploadedFileTransformedPreviewResponse = {
      previewData: { columns: [], rows: [], totalRowCount: 0 },
    };

    this.uploadError = null;
    this.uploadingFile = false;
    this.processingFile = false;
  }

  protected onConfirmImport(): void {
    if (!this.enableConfirmImport || !this.uploadedFileRawPreviewResponse.sessionId) {
      return;
    }

    this.importStage = ImportStage.IMPORTING;
    this.importMessage = 'Importing data into database...';
    this.enableConfirmImport = false;

    this.importPreviewService.confirmImportForSource(this.uploadedFileRawPreviewResponse.sessionId, this.viewSource.id, this.selectedStationId || undefined).pipe(
      take(1),
    ).subscribe({
      next: () => {
        this.importStage = ImportStage.SUCCESS;
        this.importMessage = 'File successfully imported!';

        // Delete the session. A new file upload should always start from anew session
        this.cleanupSession();

        this.pagesDataService.showToast({ title: 'File Import', message: this.importMessage, type: ToastEventTypeEnum.SUCCESS })
      },
      error: (err) => {
        this.importStage = ImportStage.ERROR;
        this.importMessage = err.error?.message || 'Import failed. Please try again.';
        this.pagesDataService.showToast({ title: 'File Import', message: this.importMessage, type: ToastEventTypeEnum.ERROR })
      }
    });
  }

  protected closeDialog(): void {
    this.cleanupSession();
    this.open = false;
  }

  /**
   * Note. Cleans up the session for the uploaded file note the sample file for the specification
   */
  private cleanupSession(): void {
    if (this.uploadedFileRawPreviewResponse.sessionId) {
      this.importPreviewService.deleteSession(this.uploadedFileRawPreviewResponse.sessionId).pipe(
        take(1),
      ).subscribe();
      this.uploadedFileRawPreviewResponse.sessionId = '';
    }
  }
}
