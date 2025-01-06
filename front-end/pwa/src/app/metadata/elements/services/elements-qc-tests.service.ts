import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { concat, EMPTY, from, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { CreateElementQCTestModel } from '../../../core/models/elements/qc-tests/create-element-qc-test.model';
import { ViewElementQCTestModel } from '../../../core/models/elements/qc-tests/view-element-qc-test.model';
import { environment } from 'src/environments/environment';
import { FindQCTestQueryModel } from '../models/find-qc-test-query.model';
import { AppDatabase } from 'src/app/app-database';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { AppConfigService } from 'src/app/app-config.service';

@Injectable({
  providedIn: 'root'
})
export class ElementsQCTestsService {

  private endPointUrl: string;

  constructor(private appConfigService: AppConfigService, private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/elements-qc-tests`;
  }

  public find(findQCTestQuery: FindQCTestQueryModel) {

    // Step 1: Observable for fetching from the local database
    const localData$ = from(AppDatabase.instance.elementsQcTests.filter(qcTest => {

      if (findQCTestQuery.observationPeriod && findQCTestQuery.observationPeriod !== qcTest.observationPeriod) {
        return false;
      }

      if (findQCTestQuery.elementIds && !findQCTestQuery.elementIds.includes(qcTest.elementId)) {
        return false;
      }

      if (findQCTestQuery.qcTestTypes && !findQCTestQuery.qcTestTypes.includes(qcTest.qcTestType)) {
        return false;
      }

      return true;
    }).toArray());

    // Step 2: Observable for fetching from the server
    const httpParams: HttpParams = StringUtils.getQueryParams<FindQCTestQueryModel>(findQCTestQuery);
    const serverData$ = this.http.get<ViewElementQCTestModel[]>(`${this.endPointUrl}`, { params: httpParams }).pipe(
      tap(serverData => {
        if (serverData) {
          // Save the server data to the local database
          AppDatabase.instance.elementsQcTests.bulkPut(serverData);
        }
      }),
      catchError((error) => {
        console.error('Error fetching elements qc tests from server:', error);
        return EMPTY; // Emit nothing and complete
      })
    );

    // Step 3: Emit both cached and server data
    return concat(
      localData$, // Emit cached data first
      serverData$ // Then emit server data next
    );
  }

  public add(createDto: CreateElementQCTestModel): Observable<ViewElementQCTestModel> {
    return this.http.post<ViewElementQCTestModel>(`${this.endPointUrl}`, createDto)
      .pipe(
        catchError(this.handleError)
      );
  }

  public update(id: number, updateDto: CreateElementQCTestModel): Observable<ViewElementQCTestModel> {
    return this.http.patch<ViewElementQCTestModel>(`${this.endPointUrl}/${id}`, updateDto)
      .pipe(
        catchError(this.handleError)
      );
  }

  public delete(id: number): Observable<number> {
    return this.http.delete<number>(`${this.endPointUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public findById(id: number): Observable<ViewElementQCTestModel> {
    return this.http.get<ViewElementQCTestModel>(`${this.endPointUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  public findQCTestByElement(elementId: number): Observable<ViewElementQCTestModel[]> {
    const findQCTestQuery: FindQCTestQueryModel = { elementIds: [elementId] };
    return this.find(findQCTestQuery);
  }

  // TODO. Push to another class 
  protected handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(`Backend returned code ${error.status}, body was: `, error.error);
    }
    // Return an observable with a user-facing error message.
    return throwError(() => new Error('Something bad happened. Please try again later.'));
  }


}
