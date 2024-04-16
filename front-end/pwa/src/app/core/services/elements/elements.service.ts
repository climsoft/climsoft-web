import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewElementModel } from '../../models/elements/view-element.model';
import { UpdateElementModel } from '../../models/elements/update-element.model';
import { CreateElementModel } from '../../models/elements/create-element.model';
import { ElementDomainEnum } from '../../models/elements/element-domain.enum';
import { ViewElementSubdomainModel } from '../../models/elements/view-element-subdomain.model';
import { ViewElementTypeModel } from '../../models/elements/view-element-type.model';

@Injectable({
  providedIn: 'root'
})
export class ElementsService {

  private endPointUrl: string = " http://localhost:3000/elements";

  constructor(private http: HttpClient) { }

  public getElements(ids?: number[]): Observable<ViewElementModel[]> {
    let params: HttpParams = new HttpParams();

    if (ids && ids.length > 0) {
      params = params.set('ids', ids.join(','));
    }

    return this.http.get<ViewElementModel[]>(this.endPointUrl, { params: params })
      .pipe(catchError(this.handleError));
  }

  public getElement(elementId: string): Observable<ViewElementModel> {
    const url = `${this.endPointUrl}/${elementId}`;
    return this.http.get<ViewElementModel>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  public create(createDto: CreateElementModel): Observable<ViewElementModel> {
    return this.http.post<ViewElementModel>(`${this.endPointUrl}`, createDto)
      .pipe(
        catchError(this.handleError)
      );
  }

  public update(id: number, updateElementDto: UpdateElementModel): Observable<ViewElementModel> {
    return this.http.patch<ViewElementModel>(`${this.endPointUrl}/${id}`, updateElementDto)
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
