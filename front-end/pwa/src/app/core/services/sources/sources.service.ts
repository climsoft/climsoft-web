import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CreateUpdateSourceModel } from '../../models/sources/create-update-source.model';
import { SourceTypeEnum } from '../../models/sources/source-type.enum';
import { ViewSourceModel } from '../../models/sources/view-source.model';
import { BaseNumberAPIService } from '../base/base-number-api.service';

@Injectable({
  providedIn: 'root'
})
export class SourcesService extends BaseNumberAPIService<CreateUpdateSourceModel, CreateUpdateSourceModel, ViewSourceModel> {

  constructor(private http: HttpClient) {
    super(http, 'sources')
  }

  public findBySourceType(sourceTypeEnum: SourceTypeEnum): Observable<ViewSourceModel[]> {
    return this.http.get<ViewSourceModel[]>(`${this.endPointUrl}/source-type/${sourceTypeEnum}`)
      .pipe(
        catchError(this.handleError)
      );
  }

}
