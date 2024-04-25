import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators'; 
import { CreateUpdateSourceModel } from '../../models/sources/create-update-source.model';
import { SourceTypeEnum } from '../../models/sources/source-type.enum';
import { ViewSourceModel } from '../../models/sources/view-source.model';
import { ViewEntryFormModel } from '../../models/sources/view-entry-form.model';
import { CreateEntryFormModel } from '../../models/sources/create-entry-form.model';

@Injectable({
  providedIn: 'root'
})
export class FormSourcesService {

  private endPointUrl: string = 'http://localhost:3000/form-sources';

  constructor(private http: HttpClient) { }

  public findAll(): Observable<ViewSourceModel<ViewEntryFormModel>[]> {

    return this.http.get<ViewSourceModel<ViewEntryFormModel>[]>(this.endPointUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  public find(id: number): Observable<ViewSourceModel<ViewEntryFormModel>> {
    return this.http.get<ViewSourceModel<ViewEntryFormModel>>(`${this.endPointUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public create(source: CreateUpdateSourceModel<CreateEntryFormModel>): Observable<ViewSourceModel<ViewEntryFormModel>> {
    return this.http.post<ViewSourceModel<ViewEntryFormModel>>(this.endPointUrl, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  public update(id: number, source: CreateUpdateSourceModel<CreateEntryFormModel>): Observable<ViewSourceModel<ViewEntryFormModel>> {
    return this.http.patch<ViewSourceModel<ViewEntryFormModel>>(`${this.endPointUrl}/${id}`, source)
      .pipe(
        catchError(this.handleError)
      );
  }

  public delete(id: number): Observable<ViewSourceModel<ViewEntryFormModel>> {
    return this.http.delete<ViewSourceModel<ViewEntryFormModel>>(`${this.endPointUrl}/${id}`)
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
