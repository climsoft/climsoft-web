import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * C - create
 * U - update
 * V - View
 */
export abstract class BaseAPIService<C,U, V> {

  protected readonly endPointUrl: string;

  constructor(protected baseHttp: HttpClient, routeEndPoint: string) {
    this.endPointUrl = `http://localhost:3000/${routeEndPoint}`
  }

  public findAll(): Observable<V[]> {
    return this.baseHttp.get<V[]>(this.endPointUrl)
      .pipe(catchError(this.handleError));
  }

  public findSome(ids: string[] | number[]): Observable<V[]> {
    let params: HttpParams = new HttpParams();
    params = params.set('ids', ids.join(','));

    return this.baseHttp.get<V[]>(this.endPointUrl, { params: params })
      .pipe(catchError(this.handleError));
  }

  public findOne(id: string | number): Observable<V> {
    const url = `${this.endPointUrl}/${id}`;
    return this.baseHttp.get<V>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  public create(createDto: C): Observable<V> {
    return this.baseHttp.post<V>(`${this.endPointUrl}`, createDto)
      .pipe(
        catchError(this.handleError)
      );
  }

  public update(id: number | string, updateDto: U): Observable<V> {
    return this.baseHttp.patch<V>(`${this.endPointUrl}/${id}`, updateDto)
      .pipe(
        catchError(this.handleError)
      );
  }


  protected handleError(error: HttpErrorResponse) {
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
