import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, Subject, take, takeUntil, throwError } from 'rxjs';
import { ImportSourceTabularParamsModel } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';
import { ImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-specifications/models/import-source.model';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-specifications/services/source-templates-cache.service';
import { AppConfigService } from 'src/app/app-config.service';
import { AppAuthService } from 'src/app/app-auth.service';

@Component({
  selector: 'app-import-entry',
  templateUrl: './import-entry.component.html',
  styleUrls: ['./import-entry.component.scss']
})
export class ImportEntryComponent implements OnInit, OnDestroy {
  protected viewSource!: ViewSourceModel;

  protected uploadMessage: string = "Upload File";
  protected uploadError: boolean = false;
  protected showUploadProgress: boolean = false;

  protected showStationSelection: boolean = false;
  protected selectedStationId!: string | null;
  protected disableUpload: boolean = false;
  protected onlyIncludeStationIds: string[] = [];

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
      return;
    }

    this.disableUpload = true;
    this.showUploadProgress = true;
    this.uploadError = false;
    this.uploadMessage = "Uploading and processing file..."

    // Get the file and append it as the form data to be sent
    const selectedFile = fileInputEvent.target.files[0] as File;
    const formData = new FormData();
    formData.append('file', selectedFile);

    let url = `${this.appConfigService.apiBaseUrl}/observations/upload/${this.viewSource.id}`;
    // If station id is provided, append it as a route parameter
    if (this.showStationSelection && this.selectedStationId) {
      url = url + "/" + this.selectedStationId;
    }

    this.http.post(url, formData).pipe(
      take(1),
      catchError(error => {
        this.disableUpload = false;
        this.showUploadProgress = false;
        this.uploadMessage = 'Something bad happened. Please try again later.';
        this.uploadError = true;
        console.log("Error returned: ", error);
        return error;
      }),
    ).subscribe(res => {
      this.disableUpload = false;
      this.showUploadProgress = false;
      // Clear the file input
      fileInputEvent.target.value = null;

      if (res) {
        let message: string = (res as any).message;
        if (message === "success") {
          this.uploadMessage = "File successfully uploaded and processed! Data Import Commenced.";
        } else {
          this.uploadMessage = message;
          this.uploadError = true;
        }
      } else {
        this.uploadMessage = "Something went wrong!";
        this.uploadError = true;
      }

    });
  }

}
