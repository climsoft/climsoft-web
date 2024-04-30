import { HttpClient} from '@angular/common/http';
import { Observable} from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseAPIService } from './base-api.service';

/**
 * C - create
 * U - update
 * V - View
 */
export abstract class BaseNumberAPIService<C,U, V>   extends BaseAPIService<C, U, V>{

  constructor(baseHttp: HttpClient, routeEndPoint: string) {
    super(baseHttp, routeEndPoint)
  }

  public override findSome(ids: number[]): Observable<V[]> {
    return this.findSome(ids);
  }

  public override findOne(id: number): Observable<V> {
    return this.findOne(id);
  }

  public override update(id: number, updateDto: U): Observable<V> {
    return this.update(id, updateDto);
  }

  public delete(id: number ): Observable< number > {
    const url = `${this.endPointUrl}/${id}`;
    return this.baseHttp.delete<number >(url)
      .pipe(
        catchError(this.handleError)
      );
  }
 
}
