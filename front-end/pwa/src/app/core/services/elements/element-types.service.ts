import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators'; 
import { ViewElementTypeModel } from 'src/app/metadata/elements/models/view-element-type.model';
import { environment } from 'src/environments/environment';

// TODO. Delete this later

@Injectable({
  providedIn: 'root'
})
export class ElementTypesService {

  private endPointUrl: string = `${environment.apiUrl}/element-types`;

  constructor(private http: HttpClient) { }

   
  public getElementTypes(ids?: number[]): Observable<ViewElementTypeModel[]> { 
    let params: HttpParams = new HttpParams();

    if (ids && ids.length > 0) {
      params = params.set('ids', ids.join(','));
    }

    return this.http.get<ViewElementTypeModel[]>(this.endPointUrl, { params: params })
      .pipe(catchError(this.handleError));
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
