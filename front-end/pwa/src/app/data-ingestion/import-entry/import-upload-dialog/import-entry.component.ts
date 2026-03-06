import { Component, OnDestroy } from '@angular/core';
import { Subject, switchMap, take, takeUntil } from 'rxjs';
import { ImportSourceTabularParamsModel } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { ImportPreviewHttpService } from 'src/app/metadata/source-specifications/services/import-preview.service';
import { RawPreviewResponse, TransformedPreviewResponse, PreviewError } from 'src/app/metadata/source-specifications/models/import-preview.model';
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
  protected viewSource!: ViewSourceModel;

  // file preview from the saved specification (sample file)
  protected sampleFileRawPreviewResponse!: RawPreviewResponse;
  protected sampleFileLoading: boolean = false;

  // file preview from uploaded file
  protected uploadedFileRawPreviewResponse!: RawPreviewResponse;
  protected uploadedFileTransformedPreviewResponse!: TransformedPreviewResponse;
  protected uploadError: PreviewError | null = null;
  protected uploadedFileLoading: boolean = false;
  protected transformedUploadedFileLoading: boolean = false;

  // Import state
  protected importStage: ImportStage = ImportStage.IDLE;
  protected readonly ImportStage = ImportStage;
  protected importMessage: string = '';
  protected showConfirmImport: boolean = false;

  protected showStationSelection: boolean = false;
  protected selectedStationId!: string | null;
  protected disableUpload: boolean = false;
  protected onlyIncludeStationIds: string[] = [];

  protected uploadedFileName: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private appAuthService: AppAuthService,
    private importPreviewHttpService: ImportPreviewHttpService,
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

  public openDialog(source: ViewSourceModel): void {
    this.viewSource = source;
    this.title = `Import Data From ${source.name}`;

    // Reset all state
    this.uploadedFileName = '';
    this.resetSamplePreview();
    this.resetUploadPreview();
    this.importStage = ImportStage.IDLE;
    this.importMessage = '';
    this.showConfirmImport = false;
    this.disableUpload = false;
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
    const importSource = this.viewSource.parameters as ImportSourceModel;
    const tabularParams = importSource.dataStructureParameters as ImportSourceTabularParamsModel;

    this.sampleFileLoading = true;

    this.importPreviewHttpService.initFromFile(
      this.viewSource.sampleFileName,
      tabularParams.rowsToSkip,
      tabularParams.delimiter,
    ).pipe(
      take(1),
    ).subscribe({
      next: (response: RawPreviewResponse) => {
        this.sampleFileRawPreviewResponse = response;
        this.sampleFileLoading = false;
        // Clean up the session - we only need the preview data
        // Note this cleans the session for the sample file not the uploaded file
        // Note, don't reset the `response.sessionId = ''` because the template uses it for the preview table to determine if it has a file
        if (response.sessionId) {
          this.importPreviewHttpService.deleteSession(response.sessionId).pipe(
            take(1),
          ).subscribe();
        }
      },
      error: () => {
        this.sampleFileLoading = false;
      }
    });
  }


  protected onFileSelected(file: File): void {
    if (this.showStationSelection && !this.selectedStationId) {
      this.importStage = ImportStage.ERROR;
      this.importMessage = 'Please select a station first';
      return;
    }

    this.uploadedFileName = file.name;

    const importSource: ImportSourceModel = this.viewSource.parameters as ImportSourceModel;
    const tabularParams: ImportSourceTabularParamsModel = importSource.dataStructureParameters as ImportSourceTabularParamsModel;

    // Clean up any existing session
    this.cleanupSession();
    this.resetUploadPreview();

    this.importStage = ImportStage.UPLOADING;
    this.importMessage = 'Uploading file...';
    this.disableUpload = true;
    this.uploadedFileLoading = true;
    this.transformedUploadedFileLoading = true;

    // Step 1: Upload file to create a preview session
    this.importPreviewHttpService.upload(file, tabularParams.rowsToSkip, tabularParams.delimiter).pipe(
      take(1),
      // Step 2: Store raw preview data, then run the transformation preview
      switchMap((rawResponse: RawPreviewResponse) => {
        this.uploadedFileLoading = false;

        this.uploadedFileRawPreviewResponse = rawResponse;
        this.importStage = ImportStage.PREVIEWING;
        this.importMessage = 'Processing preview...';
        return this.importPreviewHttpService.previewForImport(
          rawResponse.sessionId,
          this.viewSource.id,
          this.selectedStationId || undefined,
        );
      }),
    ).subscribe({
      next: (transformedResponse: TransformedPreviewResponse) => {
        this.uploadError = transformedResponse.error || null;
        this.transformedUploadedFileLoading = false;
        this.disableUpload = false;

        this.uploadedFileTransformedPreviewResponse = transformedResponse;

        if (transformedResponse.error) {
          this.importStage = ImportStage.ERROR;
          this.importMessage = 'Preview completed with errors. Please fix the issues and try again.';
          this.pagesDataService.showToast({ title: 'File Import', message: this.importMessage, type: ToastEventTypeEnum.ERROR })
        } else {
          this.importStage = ImportStage.IDLE;
          this.importMessage = 'File ready for import. Click Confirm Import button to imort the file.';
          this.showConfirmImport = true;
          this.pagesDataService.showToast({ title: 'File Import', message: this.importMessage, type: ToastEventTypeEnum.INFO })
        }
      },
      error: (err) => {
        this.uploadedFileLoading = false;
        this.transformedUploadedFileLoading = false;
        this.disableUpload = false;
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
    };

    this.sampleFileLoading = false;
  }

  private resetUploadPreview(): void {
    this.uploadedFileRawPreviewResponse = {
      sessionId: '',
      fileName: '',
      previewData: { columns: [], rows: [], totalRowCount: 0 },
      skippedData: { columns: [], rows: [], totalRowCount: 0 },
    };
    this.uploadedFileTransformedPreviewResponse = {
      previewData: { columns: [], rows: [], totalRowCount: 0 },
    };

    this.uploadError = null;
    this.uploadedFileLoading = false;
    this.transformedUploadedFileLoading = false;
  }

  protected onConfirmImport(): void {
    if (!this.uploadedFileRawPreviewResponse.sessionId) {
      return;
    }

    this.importStage = ImportStage.IMPORTING;
    this.importMessage = 'Importing data into database...';
    this.disableUpload = true;
    this.showConfirmImport = false;

    this.importPreviewHttpService.confirmImport(this.uploadedFileRawPreviewResponse.sessionId, this.viewSource.id, this.selectedStationId || undefined).pipe(
      take(1),
    ).subscribe({
      next: () => {
        this.importStage = ImportStage.SUCCESS;
        this.importMessage = 'File successfully imported!';
        this.disableUpload = false;

        // Delete the session. A new file upload should always start from anew session
        this.cleanupSession();

        this.pagesDataService.showToast({ title: 'File Import', message: this.importMessage, type: ToastEventTypeEnum.SUCCESS })
      },
      error: (err) => {
        this.importStage = ImportStage.ERROR;
        this.importMessage = err.error?.message || 'Import failed. Please try again.';
        this.disableUpload = false;
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
      this.importPreviewHttpService.deleteSession(this.uploadedFileRawPreviewResponse.sessionId).pipe(
        take(1),
      ).subscribe();
      this.uploadedFileRawPreviewResponse.sessionId = '';
    }
  }
}
