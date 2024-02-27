import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ElementModel } from '../models/element.model';

@Injectable({
  providedIn: 'root'
})
export class ElementsService {

  private endPointUrl: string = " http://localhost:3000/elements";

  constructor(private http: HttpClient) { }

  public getElements(elementIds?: number[]): Observable<ElementModel[]> {
    let params: HttpParams = new HttpParams();
    
    if (elementIds && elementIds.length > 0) {
      params = params.set('ids', elementIds.join(','));
    }
  
    return this.http.get<ElementModel[]>(this.endPointUrl, { params: params })
      .pipe(catchError(this.handleError));
  }

  public getElement(elementId: string): Observable<ElementModel> {
    const url = `${this.endPointUrl}/${elementId}`;
    return this.http.get<ElementModel>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  save(element: ElementModel[]): Observable<ElementModel[]> {
    return this.http.post<ElementModel[]>(this.endPointUrl, element)
      .pipe(
        catchError(this.handleError)
      );
  }

  delete(elementId: number): Observable<ElementModel> {
    const url = `${this.endPointUrl}/${elementId}`;
    return this.http.delete<ElementModel>(url)
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
