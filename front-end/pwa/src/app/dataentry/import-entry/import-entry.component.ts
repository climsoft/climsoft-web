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


  protected uploadProgress!: number | null;
  protected uploadSub!: Subscription | null;
  protected filePath: string = '';

  constructor(
    private pagesDataService: PagesDataService, 
    private importSourcesService: ImportSourcesService,
    private http: HttpClient,
    private location: Location,
    private route: ActivatedRoute) {
   
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['id'];
  
     // Todo. handle errors where the source is not found for the given id
     this.importSourcesService.findOne(sourceId).pipe(
      take(1)
    ).subscribe((data) => {
      this.viewSource = data;

      this.pagesDataService.setPageHeader('Import Data From '+  this.viewSource.name);
    
    });

  }

  protected onFileSelected(event: any): void {

    if (event.target.files.length === 0 ) {
      return;
     }
 
     const  selectedFile = event.target.files[0] as File;
 
     console.log('file',selectedFile)
   
     const formData = new FormData();
     formData.append('file', selectedFile);
 
     console.log("submiting: ", formData);

     const upload$ = this.http.post("http://localhost:3000/observations/upload/"+ this.viewSource.id, formData);

     upload$.subscribe();

  }

  protected onFileSelected1(event: any): void {

   
    if (event.target.files.length === 0 ) {
     return;
    }

    const  selectedFile = event.target.files[0] as File;

    console.log('file',selectedFile)
  
    const formData = new FormData();
    formData.append('file', selectedFile);

    console.log("submiting: ", formData)

    const upload$ = this.http.post("http://localhost:3000/observations3/upload2", formData, {
      reportProgress: true,
      observe: 'events'
    })
      .pipe(
        take(1),
        finalize(() => this.reset())
      );

    this.uploadSub = upload$.subscribe(event => {

      console.log('event: ', event);

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

  protected onCancelUpload(): void {
    if (this.uploadSub) {
      this.uploadSub.unsubscribe();
    }
    this.reset();
  }




}
