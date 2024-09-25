import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SourceTypeEnum } from '../../models/sources/source-type.enum';
import { BaseNumberAPIService } from '../base/base-number-api.service';
import { CreateQCTestModel } from '../../models/elements/qc-tests/create-qc-test.model';
import { UpdateQCTestModel } from '../../models/elements/qc-tests/update-qc-test.model';
import { QCTestTypeEnum } from '../../models/elements/qc-tests/qc-test-type.enum';

@Injectable({
  providedIn: 'root'
})
export class QCTestsService extends BaseNumberAPIService<CreateQCTestModel, CreateQCTestModel, UpdateQCTestModel> {

  constructor(private http: HttpClient) {
    super(http, 'qc-tests');
  }

  public findQCTestByType(qcTestTypeEnum: QCTestTypeEnum): Observable<UpdateQCTestModel[]> {
    return this.http.get<UpdateQCTestModel[]>(`${this.endPointUrl}/qc-test-type/${qcTestTypeEnum}`)
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
