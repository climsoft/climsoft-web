import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, Subject, takeUntil, throwError } from 'rxjs';
import { ImportTabularSourceModel } from 'src/app/metadata/source-templates/models/create-import-source-tabular.model';
import { CreateImportSourceModel, DataStructureTypeEnum } from 'src/app/metadata/source-templates/models/create-import-source.model';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { AppConfigService } from 'src/app/app-config.service';

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
  protected uploadProgress: number = 0;

  protected showStationSelection: boolean = false;
  protected selectedStationId!: string | null;
  protected disableUpload: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private appConfigService: AppConfigService,
    private pagesDataService: PagesDataService,
    private importSourcesService: SourceTemplatesCacheService,
    private http: HttpClient,
    private route: ActivatedRoute) {
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
      this.pagesDataService.setPageHeader('Import Data From ' + this.viewSource.name);
      const importSource: CreateImportSourceModel = this.viewSource.parameters as CreateImportSourceModel;

      if (importSource.dataStructureType === DataStructureTypeEnum.TABULAR) {
        const tabularSource: ImportTabularSourceModel = importSource.dataStructureParameters as ImportTabularSourceModel;
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
    this.uploadProgress = 0;
    this.uploadError = false;
    this.uploadMessage = "Uploading file..."

    // Get the file and append it as the form data to be sent
    const selectedFile = fileInputEvent.target.files[0] as File;
    const formData = new FormData();
    formData.append('file', selectedFile);

    const params = new HttpParams();
    let url = `${this.appConfigService.apiBaseUrl}/observations/upload/${this.viewSource.id}`;
    // If station id is provided, append it as a route parameter
    if (this.showStationSelection && this.selectedStationId) {
      url = url + "/" + this.selectedStationId;
    }

    this.http.post(
      url,
      formData,
      {
        reportProgress: true,
        observe: 'events',
        params: params
      }).pipe(
        catchError(error => {
          console.log("Error returned: ", error);
          return throwError(() => new Error('Something bad happened. Please try again later.'));
        })
      ).subscribe(event => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            this.uploadProgress = Math.round(100 * (event.loaded / event.total));
            this.uploadMessage = this.uploadProgress < 100 ? "Uploading file..." : "Processing file...";
          }
        } else if (event.type === HttpEventType.Response) {
          this.disableUpload = false;
          // Clear the file input
          fileInputEvent.target.value = null;

          // Reset upload progress
          this.showUploadProgress = false;
          this.uploadProgress = 0;
          this.uploadError = false;

          if (!event.body) {
            this.uploadMessage = "Something went wrong!";
            this.uploadError = true;
            return;
          }

          let response: string = (event.body as any).message;
          if (response === "success") {
            this.uploadMessage = "Imported data successfully saved!";
          } else {
            this.uploadMessage = response;
            this.uploadError = true;
          }
        }
      });

  }



}
