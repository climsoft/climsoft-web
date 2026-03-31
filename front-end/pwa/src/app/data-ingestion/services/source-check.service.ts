import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ViewObservationQueryModel } from '../models/view-observation-query.model';
import { AppConfigService } from 'src/app/app-config.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SourceCheckDuplicateModel } from '../models/source-check-duplicate.model';

@Injectable({
  providedIn: 'root'
})
export class SourceCheckService {

  private endPointUrl: string;

  constructor(
    private appConfigService: AppConfigService,
    private http: HttpClient,
  ) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/observations/source-check`;
  }

  public exists(filter: ViewObservationQueryModel): Observable<boolean> {
    return this.http.get<boolean>(`${this.endPointUrl}/exists`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(filter) });
  }

  public count(filter: ViewObservationQueryModel): Observable<number> {
    return this.http.get<number>(`${this.endPointUrl}/count`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(filter) });
  }

  public find(filter: ViewObservationQueryModel): Observable<SourceCheckDuplicateModel[]> {
    return this.http.get<SourceCheckDuplicateModel[]>(`${this.endPointUrl}/find`, { params: StringUtils.getQueryParams<ViewObservationQueryModel>(filter) });
  }
}
