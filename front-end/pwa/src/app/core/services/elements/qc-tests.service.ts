import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CreateUpdateSourceModel } from '../../models/sources/create-update-source.model';
import { SourceTypeEnum } from '../../models/sources/source-type.enum';
import { ViewSourceModel } from '../../models/sources/view-source.model';
import { BaseNumberAPIService } from '../base/base-number-api.service';
import { CreateQCTestModel } from '../../models/elements/qc-tests/create-qc-test.model';
import { UpdateQCTestModel } from '../../models/elements/qc-tests/update-qc-test.model';

@Injectable({
  providedIn: 'root'
})
export class QCTestsService extends BaseNumberAPIService<CreateQCTestModel, CreateQCTestModel, UpdateQCTestModel> {

  constructor(private http: HttpClient) {
    super(http, 'qc-tests');
  }

  public findQCTestByType(sourceTypeEnum: SourceTypeEnum): Observable<UpdateQCTestModel[]> {
    return this.http.get<UpdateQCTestModel[]>(`${this.endPointUrl}/qc-test-type/${sourceTypeEnum}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public findQCTestByElement(elementId: number): Observable<UpdateQCTestModel[]> {
    return this.http.get<UpdateQCTestModel[]>(`${this.endPointUrl}/element/${elementId}`)
      .pipe(
        catchError(this.handleError)
      );
  }


}
