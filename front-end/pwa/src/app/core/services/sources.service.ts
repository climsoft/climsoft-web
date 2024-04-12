import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators'; 
import { CreateUpdateSourceModel } from '../models/create-update-source.model';
import { SourceTypeEnum } from '../models/enums/source-type.enum';
import { ViewSourceModel } from '../models/view-source.model';

@Injectable({
  providedIn: 'root'
})
export class SourcesService {

  endPointUrl: string = 'http://localhost:3000/sources';

  constructor(private http: HttpClient) { }

  public getSource(sourceId: number): Observable<ViewSourceModel> {
    return this.http.get<ViewSourceModel>(`${this.endPointUrl}/source/${sourceId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public getSources(sourceTypeEnum?: SourceTypeEnum): Observable<ViewSourceModel[]> {
    let url: string = this.endPointUrl;
    if (sourceTypeEnum) {
      url = `${this.endPointUrl}/source-type/${sourceTypeEnum}`
    }

    return this.http.get<ViewSourceModel[]>(this.endPointUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  public getForms(ids?: number[]): Observable<ViewSourceModel[]> {
    return this.getSources(SourceTypeEnum.FORM);
  }

  public createSource(source: CreateUpdateSourceModel): Observable<ViewSourceModel> {
    return this.http.post<ViewSourceModel>(this.endPointUrl, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  public updateSource(id: number, source: CreateUpdateSourceModel): Observable<ViewSourceModel> {
    return this.http.patch<ViewSourceModel>(`${this.endPointUrl}/${id}`, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  public deleteSource(id: number): Observable<ViewSourceModel> {
    //todo use json as body of ids?
    const url = `${this.endPointUrl}/${id}`;
    return this.http.delete<ViewSourceModel>(url)
      .pipe(
        catchError(this.handleError)
      );
  }



  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(`Backend returned code ${error.status}, body was: `, error.error);
    }
    // Return an observable with a user-facing error message.
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }

}
