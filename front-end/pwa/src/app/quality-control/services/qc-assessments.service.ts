
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { AppConfigService } from 'src/app/app-config.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SourceCheckDuplicateModel } from '../../data-ingestion/models/source-check-duplicate.model';

@Injectable({
  providedIn: 'root'
})
export class QCAssessmentsService {

  private endPointUrl: string;

  constructor(
    private appConfigService: AppConfigService,
    private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/observations/quality-control`;
  }

  public performQC(qcSelection: ViewObservationQueryModel): Observable<{ message: string, qcFails: number }> {
    return this.http.post<{ message: string, qcFails: number }>(`${this.endPointUrl}/perform-qc`, qcSelection);
  }
}
