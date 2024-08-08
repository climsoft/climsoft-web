import { Location } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, finalize, take } from 'rxjs';
import { CreateImportSourceModel } from 'src/app/core/models/sources/create-import-source.model';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ImportSourcesService } from 'src/app/core/services/sources/import-sources.service';

@Component({
  selector: 'app-import-entry',
  templateUrl: './import-entry.component.html',
  styleUrls: ['./import-entry.component.scss']
})
export class ImportEntryComponent implements OnInit {

  protected viewSource!: ViewSourceModel<CreateImportSourceModel>;
  protected uploadFeedback: string = "Upload File";
  protected uploadError!: boolean;
  protected uploadProgress!: number | null;

  constructor(
    private pagesDataService: PagesDataService,
    private importSourcesService: ImportSourcesService,
    private http: HttpClient,
    private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['id'];
    // Todo. handle errors where the source is not found for the given id
    this.importSourcesService.findOne(sourceId).pipe(
      take(1)
    ).subscribe((data) => {
      this.viewSource = data;
      this.pagesDataService.setPageHeader('Import Data From ' + this.viewSource.name);
    });

  }

  protected onFileSelected(fileInputEvent: any): void {

    if (fileInputEvent.target.files.length === 0) {
      return;
    }

    this.uploadFeedback = "Uploading file: 0" 
    this.uploadError = false;

    const selectedFile = fileInputEvent.target.files[0] as File;
    const formData = new FormData();
    formData.append('file', selectedFile);
    this.http.post(
      "http://localhost:3000/observations/upload/" + this.viewSource.id,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }).subscribe(event => {
        if (event.type == HttpEventType.UploadProgress) {
          if (event.total) {
            this.uploadProgress = Math.round(100 * (event.loaded / event.total));
            if (this.uploadProgress < 100) {
              this.uploadFeedback = "Uploading file: " + this.uploadProgress;
            } else {
              this.uploadFeedback = "Processing file...";
            }
          }
        } else if (event.type == HttpEventType.Response) {
         // Clear the file input
         fileInputEvent.target.value = null;

          if (!event.body) {
            this.uploadFeedback = "Something went wrong!";
            this.uploadError = true;
            return;
          }

          let response: string = (event.body as any).message;
          if (response === 'success') {
            this.uploadFeedback = "Imported Data Saved!";
          } else {
            this.uploadFeedback = response;
            this.uploadError = true;
          }

        }
      });

  }



}
