import { Component, OnDestroy } from '@angular/core';
import { Subject, switchMap, take, takeUntil } from 'rxjs';
import { ImportSourceTabularParamsModel } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { ImportPreviewHttpService } from 'src/app/metadata/source-specifications/import-source-detail/services/import-preview.service';
import { RawPreviewResponse, StepPreviewResponse, PreviewWarning, PreviewError } from 'src/app/metadata/source-specifications/models/import-preview.model';

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
export class ImportEntryComponent implements OnDestroy {
  protected open: boolean = false;
  protected title: string = '';
  protected viewSource!: ViewSourceModel;

  // Sample file preview (from the saved specification)
  protected sampleColumns: string[] = [];
  protected sampleRows: string[][] = [];
  protected sampleSkippedRows: string[][] = [];
  protected sampleTotalRowCount: number = 0;
  protected sampleLoading: boolean = false;
  protected sampleHasFile: boolean = false;

  // Raw upload preview (user's uploaded file before transformation)
  protected rawUploadColumns: string[] = [];
  protected rawUploadRows: string[][] = [];
  protected rawUploadTotalRowCount: number = 0;
  protected rawUploadHasFile: boolean = false;

  // Upload preview (user's uploaded file after transformation)
  protected uploadColumns: string[] = [];
  protected uploadRows: string[][] = [];
  protected uploadTotalRowCount: number = 0;
  protected uploadRowsDropped: number = 0;
  protected uploadWarnings: PreviewWarning[] = [];
  protected uploadError: PreviewError | null = null;
  protected uploadLoading: boolean = false;
  protected uploadHasFile: boolean = false;

  // Import state
  protected importStage: ImportStage = ImportStage.IDLE;
  protected readonly ImportStage = ImportStage;
  protected importMessage: string = '';
  protected showConfirmImport: boolean = false;

  protected showStationSelection: boolean = false;
  protected selectedStationId!: string | null;
  protected disableUpload: boolean = false;
  protected onlyIncludeStationIds: string[] = [];

  private sessionId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private importPreviewHttpService: ImportPreviewHttpService,
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
  }

  public openDialog(source: ViewSourceModel): void {
    this.viewSource = source;
    this.title = `Import Data From ${source.name}`;

    // Reset all state
    this.resetSamplePreview();
    this.resetUploadPreview();
    this.importStage = ImportStage.IDLE;
    this.importMessage = '';
    this.showConfirmImport = false;
    this.disableUpload = false;
    this.selectedStationId = null;
    this.sessionId = null;

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

  protected closeDialog(): void {
    this.cleanupSession();
    this.open = false;
  }

  ngOnDestroy(): void {
    this.cleanupSession();
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onFileSelected(file: File): void {
    if (this.showStationSelection && !this.selectedStationId) {
      this.importStage = ImportStage.ERROR;
      this.importMessage = 'Please select a station first';
      return;
    }

    this.uploadFile(file);
  }


  private loadSampleFilePreview(): void {
    const importSource = this.viewSource.parameters as ImportSourceModel;
    const tabularParams = importSource.dataStructureParameters as ImportSourceTabularParamsModel;

    this.sampleLoading = true;
    this.sampleHasFile = true;

    this.importPreviewHttpService.initFromFile(
      this.viewSource.sampleFileName,
      tabularParams.rowsToSkip,
      tabularParams.delimiter,
    ).pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (response: RawPreviewResponse) => {
        this.sampleColumns = response.columns;
        this.sampleRows = response.previewRows;
        this.sampleSkippedRows = response.skippedRows;
        this.sampleTotalRowCount = response.totalRowCount;
        this.sampleLoading = false;
        // Clean up the session - we only need the preview data
        if (response.sessionId) {
          this.importPreviewHttpService.deleteSession(response.sessionId).pipe(
            take(1),
          ).subscribe();
        }
      },
      error: () => {
        this.sampleLoading = false;
      }
    });
  }

  private uploadFile(file: File): void {
    const importSource = this.viewSource.parameters as ImportSourceModel;
    const tabularParams = importSource.dataStructureParameters as ImportSourceTabularParamsModel;

    // Clean up any existing session
    this.cleanupSession();
    this.resetUploadPreview();

    this.importStage = ImportStage.UPLOADING;
    this.importMessage = 'Uploading file...';
    this.disableUpload = true;
    this.uploadLoading = true;
    this.uploadHasFile = true;

    // Step 1: Upload file to create a preview session
    this.importPreviewHttpService.upload(file, tabularParams.rowsToSkip, tabularParams.delimiter).pipe(
      take(1),
      // Step 2: Store raw preview data, then run the transformation preview
      switchMap((rawResponse: RawPreviewResponse) => {
        this.sessionId = rawResponse.sessionId;
        this.rawUploadColumns = rawResponse.columns;
        this.rawUploadRows = rawResponse.previewRows;
        this.rawUploadTotalRowCount = rawResponse.totalRowCount;
        this.rawUploadHasFile = true;
        this.importStage = ImportStage.PREVIEWING;
        this.importMessage = 'Processing preview...';
        return this.importPreviewHttpService.previewForImport(
          rawResponse.sessionId,
          this.viewSource.id,
          this.selectedStationId || undefined,
        );
      }),
    ).subscribe({
      next: (stepResponse: StepPreviewResponse) => {
        this.uploadColumns = stepResponse.columns;
        this.uploadRows = stepResponse.previewRows;
        this.uploadTotalRowCount = stepResponse.totalRowCount;
        this.uploadRowsDropped = stepResponse.rowsDropped;
        this.uploadWarnings = stepResponse.warnings;
        this.uploadError = stepResponse.error || null;
        this.uploadLoading = false;
        this.disableUpload = false;

        if (stepResponse.error) {
          this.importStage = ImportStage.ERROR;
          this.importMessage = 'Preview completed with errors. Please fix the issues and try again.';
        } else {
          this.importStage = ImportStage.IDLE;
          this.importMessage = '';
          this.showConfirmImport = true;
        }
      },
      error: (err) => {
        this.uploadLoading = false;
        this.disableUpload = false;
        this.importStage = ImportStage.ERROR;
        this.importMessage = err.error?.message || 'Failed to process file. Please try again.';
      }
    });
  }

  private resetSamplePreview(): void {
    this.sampleColumns = [];
    this.sampleRows = [];
    this.sampleSkippedRows = [];
    this.sampleTotalRowCount = 0;
    this.sampleLoading = false;
    this.sampleHasFile = false;
  }

  private resetUploadPreview(): void {
    this.rawUploadColumns = [];
    this.rawUploadRows = [];
    this.rawUploadTotalRowCount = 0;
    this.rawUploadHasFile = false;
    this.uploadColumns = [];
    this.uploadRows = [];
    this.uploadTotalRowCount = 0;
    this.uploadRowsDropped = 0;
    this.uploadWarnings = [];
    this.uploadError = null;
    this.uploadLoading = false;
    this.uploadHasFile = false;
  }


  protected onConfirmImport(): void {
    if (!this.sessionId) {
      return;
    }

    this.importStage = ImportStage.IMPORTING;
    this.importMessage = 'Importing data into database...';
    this.disableUpload = true;
    this.showConfirmImport = false;

    this.importPreviewHttpService.confirmImport(this.sessionId, this.viewSource.id, this.selectedStationId || undefined).pipe(
      take(1),
    ).subscribe({
      next: () => {
        this.importStage = ImportStage.SUCCESS;
        this.importMessage = 'File successfully imported!';
        this.disableUpload = false;
        this.sessionId = null;
      },
      error: (err) => {
        this.importStage = ImportStage.ERROR;
        this.importMessage = err.error?.message || 'Import failed. Please try again.';
        this.disableUpload = false;
      }
    });
  }

  // protected onCancelImport(): void {
  //   this.cleanupSession();
  //   this.resetUploadPreview();
  //   this.importStage = ImportStage.IDLE;
  //   this.importMessage = '';
  //   this.showConfirmImport = false;
  //   this.disableUpload = false;
  // }

  private cleanupSession(): void {
    if (this.sessionId) {
      this.importPreviewHttpService.deleteSession(this.sessionId).pipe(
        take(1),
      ).subscribe();
      this.sessionId = null;
    }
  }
}
