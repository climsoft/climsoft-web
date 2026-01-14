import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { ImportSourceTabularParamsModel } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-specifications/services/source-templates-cache.service';
import { AppConfigService } from 'src/app/app-config.service';
import { AppAuthService } from 'src/app/app-auth.service';

enum UploadStage {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  IMPORTING = 'importing',
  SUCCESS = 'success',
  ERROR = 'error'
}

// TODO. 
// In future, this component will use server sent events to show processing and importing events.
// Right now the uploading, processing and importing are waited upon via the active http request which may result to timeouts.

@Component({
  selector: 'app-import-entry',
  templateUrl: './import-entry.component.html',
  styleUrls: ['./import-entry.component.scss']
})
export class ImportEntryComponent implements OnInit, OnDestroy {
  protected viewSource!: ViewSourceModel;

  protected uploadMessage: string = "Select a file to begin import";
  protected uploadError: boolean = false;
  protected uploadStage: UploadStage = UploadStage.IDLE;
  protected readonly UploadStage = UploadStage; // Expose enum to template

  protected showStationSelection: boolean = false;
  protected selectedStationId!: string | null;
  protected disableUpload: boolean = false;
  protected onlyIncludeStationIds: string[] = [];

  // Timer properties
  protected elapsedTime: string = '00:00';
  protected selectedFileName: string = '';
  private startTime: number = 0;
  private timerInterval: any;

  private destroy$ = new Subject<void>();

  constructor(
    private appConfigService: AppConfigService,
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private importSourcesService: SourceTemplatesCacheService,
    private http: HttpClient,
    private route: ActivatedRoute) {

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
    // Todo. handle errors where the source is not found for the given id
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
    });
  }

  ngOnDestroy() {
    this.stopTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onFileSelected(fileInputEvent: any): void {
    if (fileInputEvent.target.files.length === 0) {
      return;
    }

    if (this.showStationSelection && !this.selectedStationId) {
      this.uploadMessage = "Select station";
      this.uploadError = true;
      this.uploadStage = UploadStage.ERROR;
      return;
    }

    // Get the selected file
    const selectedFile = fileInputEvent.target.files[0] as File;
    this.selectedFileName = selectedFile.name;

    // Initialize upload state
    this.disableUpload = true;
    this.uploadError = false;
    this.uploadStage = UploadStage.UPLOADING;
    this.uploadMessage = "Uploading file to server...";
    this.startTimer();

    // Prepare form data
    const formData = new FormData();
    formData.append('file', selectedFile);

    let url = `${this.appConfigService.apiBaseUrl}/observations/upload/${this.viewSource.id}`;
    // If station id is provided, append it as a route parameter
    if (this.showStationSelection && this.selectedStationId) {
      url = url + "/" + this.selectedStationId;
    }

    this.http.post(url, formData).pipe(
      take(1),
    ).subscribe({
      next: res => {
        this.stopTimer();
        this.disableUpload = false;
        // Clear the file input
        fileInputEvent.target.value = null;

        if (res) {
          let message: string = (res as any).message;
          if (message === 'success') {
            this.uploadStage = UploadStage.SUCCESS;
            this.uploadMessage = 'File successfully uploaded and imported!';
          } else {
            this.uploadStage = UploadStage.ERROR;
            this.uploadMessage = message;
            this.uploadError = true;
          }
        } else {
          this.uploadStage = UploadStage.ERROR;
          this.uploadMessage = 'Something went wrong!';
          this.uploadError = true;
        }
      }
      ,
      error: err => {
        this.stopTimer();
        this.disableUpload = false;
        this.uploadStage = UploadStage.ERROR;
        this.uploadMessage = 'Something bad happened. Please try again later.';
        this.uploadError = true;
        console.log("Error returned: ", err); 
      }
    },

    );
  }

  private startTimer(): void {
    this.startTime = Date.now();
    this.elapsedTime = '00:00';

    this.timerInterval = setInterval(() => {
      this.updateElapsedTime();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateElapsedTime(): void {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    this.elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

}
