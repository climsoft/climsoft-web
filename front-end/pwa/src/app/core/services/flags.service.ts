import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Flag } from '../models/Flag.model';

@Injectable({
  providedIn: 'root'
})
export class FlagsService {

  endPointUrl: string = " http://localhost:3000/flags";

  constructor(private http: HttpClient) { }

  getFlags(): Observable<Flag[]> { 
    return this.http.get<Flag[]>(this.endPointUrl)
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
