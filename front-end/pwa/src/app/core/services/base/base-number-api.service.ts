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
    return super.findSome(ids);
  }

  public override findOne(id: number): Observable<V> {
    return super.findOne(id);
  }

  public override update(id: number, updateDto: U): Observable<V> {
    return super.update(id, updateDto);
  }

  public delete(id: number ): Observable< number > { 
    return super.baseHttp.delete<number >(`${this.endPointUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }
 
}
