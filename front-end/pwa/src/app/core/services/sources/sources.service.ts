import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators'; 
import { CreateUpdateSourceModel } from '../../models/sources/create-update-source.model';
import { SourceTypeEnum } from '../../models/sources/source-type.enum';
import { ViewSourceModel } from '../../models/sources/view-source.model';

@Injectable({
  providedIn: 'root'
})
export class SourcesService  {

  endPointUrl: string = 'http://localhost:3000/sources';

  constructor(private http: HttpClient) { }

   /** TODO. Deprecate */
  public find(sourceId: number): Observable<ViewSourceModel<object>> {
    return this.http.get<ViewSourceModel<object>>(`${this.endPointUrl}/source/${sourceId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

 
  public findAll(sourceTypeEnum?: SourceTypeEnum): Observable<ViewSourceModel<object>[]> {
  
    if (sourceTypeEnum) {
      this.endPointUrl = `${this.endPointUrl}/source-type/${sourceTypeEnum}`
    }

    return this.http.get<ViewSourceModel<object>[]>(this.endPointUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  
 /** TODO. Deprecate */
  public create(source: CreateUpdateSourceModel<object>): Observable<ViewSourceModel<object>> {
    return this.http.post<ViewSourceModel<object>>(this.endPointUrl, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  public update(id: number, source: CreateUpdateSourceModel<object>): Observable<ViewSourceModel<object>> {
    return this.http.patch<ViewSourceModel<object>>(`${this.endPointUrl}/${id}`, source)
      .pipe(
        catchError(this.handleError)
      );
  }

   /** TODO. Deprecate */
  private delete(id: number): Observable<number> {
    //todo use json as body of ids?
    const url = `${this.endPointUrl}/${id}`;
    return this.http.delete<number>(url)
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
