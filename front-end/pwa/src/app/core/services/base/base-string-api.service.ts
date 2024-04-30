import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseAPIService } from './base-api.service';

/**
 * C - create
 * U - update
 * V - View
 */
export abstract class BaseStringAPIService<C, U, V> extends BaseAPIService<C, U, V> {

  constructor(baseHttp: HttpClient, routeEndPoint: string) {
    super(baseHttp, routeEndPoint)
  }

  public override findSome(ids: string[]): Observable<V[]> {
    return this.findSome(ids);
  }

  public override findOne(id: string): Observable<V> {
    return this.findOne(id);
  }

  public override update(id: string, updateDto: U): Observable<V> {
    return this.update(id, updateDto);
  }

  public delete(id: string): Observable<string> {
    const url = `${this.endPointUrl}/${id}`;
    return this.baseHttp.delete<string>(url)
      .pipe(
        catchError(this.handleError)
      );
  }


}
