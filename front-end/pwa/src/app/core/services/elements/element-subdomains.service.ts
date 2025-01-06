import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ElementDomainEnum } from '../../../metadata/elements/models/element-domain.enum';
import { ViewElementSubdomainModel } from 'src/app/metadata/elements/models/view-element-subdomain.model';
import { AppConfigService } from 'src/app/app-config.service';

// TODO. Delete this later

@Injectable({
  providedIn: 'root'
})
export class ElementSubdomainsService {

  private endPointUrl: string;

  constructor(private appConfigService: AppConfigService, private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/element-subdomains`;
  }

  public getElementSubdomains(domainEnum?: ElementDomainEnum): Observable<ViewElementSubdomainModel[]> {
    let url: string = `${this.endPointUrl}`;
    if (domainEnum) {
      url = `${this.endPointUrl}/${domainEnum}`
    }
    return this.http.get<ViewElementSubdomainModel[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(`Backend returned code ${error.status}, body was: `, error.error);
    }
    // Return an observable with a user-facing error message.
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }
}
