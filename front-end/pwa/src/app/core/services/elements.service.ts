import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Element } from '../models/element.model';

@Injectable({
  providedIn: 'root'
})
export class ElementsService {

  endPointUrl: string = " http://localhost:3000/elements";

  constructor(private http: HttpClient) { }

  getElements(elementIds?: number[]): Observable<Element[]> {
    
    const obsParams: { [key: string]: number[] } = {};
    if (elementIds) {
      obsParams['ids'] = elementIds;
    }

    //todo. load slected elements
    return this.http.get<Element[]>(this.endPointUrl, { params: obsParams})
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
