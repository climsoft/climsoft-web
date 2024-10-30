import { Location } from '@angular/common';
import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, take, throwError } from 'rxjs';
import { CreateImportTabularSourceModel } from 'src/app/core/models/sources/create-import-source-tabular.model';
import { CreateImportSourceModel, FormatEnum } from 'src/app/core/models/sources/create-import-source.model';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-import-stations-dialog',
  templateUrl: './import-stations-dialog.component.html',
  styleUrls: ['./import-stations-dialog.component.scss']
})
export class ImportStationsDialogComponent implements OnInit {
  @Output()
  okClick = new EventEmitter<void>();

  protected open: boolean = false;
  protected uploadMessage: string = "";
  protected uploadError: boolean = false;
  protected showUploadProgress: boolean = false;
  protected uploadProgress: number = 0;

  protected disableUpload: boolean = false;
  private fileInputEvent: any;
  protected fileName: string = "";

  constructor(
    private pagesDataService: PagesDataService,
    private http: HttpClient) {
  }

  public openDialog(): void {
    this.open = true;
    this.uploadMessage = "";
    this.uploadError = false;
    this.uploadProgress = 0;
    this.disableUpload = false;
    this.fileInputEvent= undefined;
    this.fileName = "";
  }

  ngOnInit(): void {
  }

  protected onFileSelected(fileInputEvent: any): void {
    this.fileInputEvent = fileInputEvent;
    const selectedFile = this.fileInputEvent.target.files.length === 0 ? undefined : this.fileInputEvent.target.files[0] as File;
    this.fileName = selectedFile ? selectedFile.name : "Select file to upload";
  }

  protected onOkClick(): void {
    if (!this.fileInputEvent || this.fileInputEvent.target.files.length === 0) {
      return;
    }

    if( this.disableUpload){
      return;
    }

    const selectedFile = this.fileInputEvent.target.files[0] as File;

    this.disableUpload = true;
    this.showUploadProgress = true;
    this.uploadProgress = 0;
    this.uploadError = false;
    this.uploadMessage = "Uploading file..."

    // Get the file and append it as the form data to be sent

    const formData = new FormData();
    formData.append('file', selectedFile);

    const params = new HttpParams();
    const url = `${environment.apiUrl}/stations/upload`;

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
          this.fileInputEvent.target.value = null;

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
            this.open = false; // close the dialog
            this.pagesDataService.showToast({ title: 'Stations Import', message: 'Stations imported successfully', type: 'success' })
            this.okClick.emit();
          } else {
            this.uploadMessage = response;
            this.uploadError = true;
          }
        }
      });

  }



}
