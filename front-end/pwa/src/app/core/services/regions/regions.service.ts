import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseNumberAPIService } from '../base/base-number-api.service';
import { ViewRegionModel } from '../../models/Regions/view-region.model';

@Injectable({
  providedIn: 'root'
})
export class RegionsService extends BaseNumberAPIService<ViewRegionModel, ViewRegionModel, ViewRegionModel> {

  constructor(private http: HttpClient) {
    super(http, 'regions')
  }

  // public findBySourceType(sourceTypeEnum: SourceTypeEnum): Observable<ViewRegionModel[]> {
  //   return this.http.get<ViewRegionModel[]>(`${this.endPointUrl}/source-type/${sourceTypeEnum}`)
  //     .pipe(
  //       catchError(this.handleError)
  //     );
  // }

}
