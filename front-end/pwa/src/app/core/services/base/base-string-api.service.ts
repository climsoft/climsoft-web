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
    return super.findSome(ids);
  }

  public override findOne(id: string): Observable<V> {
    return super.findOne(id);
  }

  public override update(id: string, updateDto: U): Observable<V> {
    return super.update(id, updateDto);
  }

  public delete(id: string): Observable<string> { 
    return super.baseHttp.delete<string>(`${this.endPointUrl}/${id}`)
      .pipe(
        catchError(super.handleError)
      );
  }


}
