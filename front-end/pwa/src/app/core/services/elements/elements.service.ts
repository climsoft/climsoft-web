import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { CreateViewElementModel } from '../../../metadata/elements/models/create-view-element.model';
import { UpdateElementModel } from '../../../metadata/elements/models/update-element.model'; 
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ViewElementQueryModel } from '../../models/elements/view-element-query.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Injectable({
  providedIn: 'root'
})
export class ElementsService  {

  private endPointUrl: string = `${environment.apiUrl}/elements`;

  constructor(private http: HttpClient) {  }

  public findOne(id: number): Observable<CreateViewElementModel> {
    const url = `${this.endPointUrl}/id/${id}`;
    return this.http.get<CreateViewElementModel>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  public find(viewQuery?: ViewElementQueryModel): Observable<CreateViewElementModel[]> {
    let httpParams: HttpParams = new HttpParams();
    if (viewQuery) {
      httpParams = StringUtils.getQueryParams<ViewElementQueryModel>(viewQuery)
    }
    return this.http.get<CreateViewElementModel[]>(`${this.endPointUrl}`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  public count(viewQuery: ViewElementQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count`, { params: StringUtils.getQueryParams<ViewElementQueryModel>(viewQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  
  public create(createDto: CreateViewElementModel): Observable<CreateViewElementModel> {
    return this.http.post<CreateViewElementModel>(`${this.endPointUrl}`, createDto)
      .pipe(
        catchError(this.handleError)
      );
  }

  public update(id: number , updateDto: UpdateElementModel): Observable<CreateViewElementModel> {
    return this.http.patch<CreateViewElementModel>(`${this.endPointUrl}/${id}`, updateDto)
      .pipe(
        catchError(this.handleError)
      );
  }

  public delete(id: number): Observable<number> { 
    return this.http.delete<number>(`${this.endPointUrl}/${id}`)
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
    return throwError(() => new Error('Something bad happened. please try again later.'));
  }

}
