import { HttpClient, HttpEventType } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-import-entry',
  templateUrl: './import-entry.component.html',
  styleUrls: ['./import-entry.component.scss']
})
export class ImportEntryComponent implements OnInit {


  protected uploadProgress!: number | null;
  protected uploadSub!: Subscription | null;
  protected filePath: string = '';

  constructor(private pagesDataService: PagesDataService, private http: HttpClient) {
    this.pagesDataService.setPageHeader('Import Data');
  }

  ngOnInit(): void {
  }

  protected onFileSelected(event: any) {
    if (event.target.files.length > 0 && event.target.files[0]) {
      this.uploadFile(event.target.files[0] as File);
    }
  }

  protected onCancelUpload(): void {
    if (this.uploadSub) {
      this.uploadSub.unsubscribe();
    }
    this.reset();
  }

  private uploadFile(selectedFile: File): void {
    const formData = new FormData();
    formData.append('file', selectedFile);

    const upload$ = this.http.post("http://localhost:3000/observations/upload", formData, {
      reportProgress: true,
      observe: 'events'
    })
      .pipe(
        finalize(() => this.reset())
      );

    this.uploadSub = upload$.subscribe(event => {
      if (event.type == HttpEventType.UploadProgress) {
        if (event.total) {
          this.uploadProgress = Math.round(100 * (event.loaded / event.total));
          console.log('progress', this.uploadProgress);
        }
      } else if (event.type == HttpEventType.Response) {

        this.filePath = '';

        if (!event.body) {
          //todo. something wrong
          return;
        }

        let response: string = event.body.toString();
        if (response.includes('success')) {
          const dataSaved: number = parseInt(response.split(',')[1]);

          this.pagesDataService.showToast({
            title: 'Imported Data', message: `${dataSaved} observation${dataSaved === 1 ? '' : 's'} saved`, type: 'success'
          });
        } else {
          this.pagesDataService.showToast({
            title: 'Import Error', message: response, type: 'error'
          });
        }



      }
    });

  }

  private reset(): void {
    this.uploadProgress = null;
    this.uploadSub = null;
  }



}
