import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { SourceModel, SourceTypeEnum } from '../models/source.model';

@Injectable({
  providedIn: 'root'
})
export class SourcesService {

  endPointUrl: string = 'http://localhost:3000/sources';

  constructor(private http: HttpClient) { }

  public getSource(sourceId: number): Observable<SourceModel> {
    return this.http.get<SourceModel>(`${this.endPointUrl}/source/${sourceId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public getSources(sourceTypeId?: SourceTypeEnum): Observable<SourceModel[]> {
    let url: string = this.endPointUrl;
    if (sourceTypeId) {
      url = `${this.endPointUrl}/source-type/${sourceTypeId}`
    }

    return this.http.get<SourceModel[]>(this.endPointUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  public getForms(): Observable<SourceModel[]> {
    return this.getSources(1);
  }

  public createSource(source: SourceModel): Observable<SourceModel> {
    return this.http.post<SourceModel>(this.endPointUrl, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateSource(source: SourceModel): Observable<SourceModel> {
    const url = `${this.endPointUrl}/${source.id}`;
    return this.http.patch<SourceModel>(url, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteSource(id: number): Observable<SourceModel> {
    //todo use json as body of ids?
    const url = `${this.endPointUrl}/${id}`;
    return this.http.delete<SourceModel>(url)
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
