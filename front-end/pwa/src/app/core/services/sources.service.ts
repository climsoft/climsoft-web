import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Source } from '../models/source.model';

@Injectable({
  providedIn: 'root'
})
export class SourcesService {

  endPointUrl: string = " http://localhost:3000/sources";

  constructor(private http: HttpClient) { }

  getSources(sourceTypeId: number): Observable<Source[]> { 
    return this.http.get<Source[]>(this.endPointUrl,{params: new HttpParams().set('sourceTypeId', sourceTypeId)})
      .pipe(
        catchError(this.handleError)
      );
  }

  getSource(sourceId: number): Observable<Source> { 
    return this.http.get<Source>(this.endPointUrl,{params: new HttpParams().set('sourceId', sourceId)})
      .pipe(
        catchError(this.handleError)
      );
  }

  createSource(source: Source): Observable<Source> {
    return this.http.post<Source>(this.endPointUrl, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateSource(source: Source): Observable<Source> {
    const url = `${this.endPointUrl}/${source.id}`; 
    return this.http.patch<Source>(url, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteSource(id: number): Observable<Source> {
    //todo use json as body of ids?
    const url = `${this.endPointUrl}/${id}`; 
    return this.http.delete<Source>(url)
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
