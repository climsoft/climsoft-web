import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, switchMap, take, takeUntil } from 'rxjs';
import { ImportSourceTabularParamsModel } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourcesCacheService } from 'src/app/metadata/source-specifications/services/source-cache.service';
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
export class ImportEntryComponent implements OnInit, OnDestroy {
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
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private importSourcesService: SourcesCacheService,
    private importPreviewHttpService: ImportPreviewHttpService,
    private route: ActivatedRoute,
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

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['id'];
    this.importSourcesService.findOne(+sourceId).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      if (!data) {
        return;
      }
      this.viewSource = data;
      this.pagesDataService.setPageHeader(`Import Data From ${this.viewSource.name}`);
      const importSource: ImportSourceModel = this.viewSource.parameters as ImportSourceModel;

      if (importSource.dataStructureType === DataStructureTypeEnum.TABULAR) {
        const tabularSource: ImportSourceTabularParamsModel = importSource.dataStructureParameters as ImportSourceTabularParamsModel;
        this.showStationSelection = !tabularSource.stationDefinition;
      }

      // Load sample file preview if available
      if (this.viewSource.sampleFileName) {
        this.loadSampleFilePreview();
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanupSession();
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onFileSelected(fileInputEvent: any): void {
    if (fileInputEvent.target.files.length === 0) {
      return;
    }

    if (this.showStationSelection && !this.selectedStationId) {
      this.importStage = ImportStage.ERROR;
      this.importMessage = 'Please select a station first';
      return;
    }

    const selectedFile = fileInputEvent.target.files[0] as File;
    // Clear the file input so the same file can be re-selected
    fileInputEvent.target.value = null;

    this.uploadFile(selectedFile);
  }

  protected onConfirmImport(): void {
    if (!this.sessionId) {
      return;
    }

    this.importStage = ImportStage.IMPORTING;
    this.importMessage = 'Importing data into database...';
    this.disableUpload = true;
    this.showConfirmImport = false;

    this.importPreviewHttpService.confirmImport(this.sessionId).pipe(
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

  protected onCancelImport(): void {
    this.cleanupSession();
    this.resetUploadPreview();
    this.importStage = ImportStage.IDLE;
    this.importMessage = '';
    this.showConfirmImport = false;
    this.disableUpload = false;
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

  private cleanupSession(): void {
    if (this.sessionId) {
      this.importPreviewHttpService.deleteSession(this.sessionId).pipe(
        take(1),
      ).subscribe();
      this.sessionId = null;
    }
  }
}
