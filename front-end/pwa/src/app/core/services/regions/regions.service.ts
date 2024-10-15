import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseNumberAPIService } from '../base/base-number-api.service';
import { ViewRegionModel } from '../../models/Regions/view-region.model';
import { ViewRegionQueryModel } from '../../models/Regions/view-region-query.model';
import { catchError, Observable } from 'rxjs';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Injectable({
  providedIn: 'root'
})
export class RegionsService extends BaseNumberAPIService<ViewRegionModel, ViewRegionModel, ViewRegionModel> {

  constructor(private http: HttpClient) {
    super(http, 'regions')
  }

  public findRegions(viewObsQuery: ViewRegionQueryModel): Observable<ViewRegionModel[]> {
    return this.http.get<ViewRegionModel[]>(`${this.endPointUrl}`, { params: StringUtils.getQueryParams<ViewRegionQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public count(viewObsQuery: ViewRegionQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count`, { params: StringUtils.getQueryParams<ViewRegionQueryModel>(viewObsQuery) })
      .pipe(
        catchError(this.handleError)
      );
  }

  public deleteAll(): Observable<number> {
    return this.http.delete<number>(`${this.endPointUrl}/delete-all`)
      .pipe(
        catchError(this.handleError)
      );
  }

}
