import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AppAuthService } from './app-auth.service';
import { NetworkStatusTypeEnum, PagesDataService } from './core/services/pages-data.service';

@Injectable()
export class AppAuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AppAuthService,
    private pagesDataService: PagesDataService,
    //private router: Router,
    //private activatedRoute: ActivatedRoute
  ) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const modifiedReq = request.clone({ withCredentials: true });
    return next.handle(modifiedReq).pipe(
      catchError(err => {
        // If error is from logout or login url then just return to avoid race conditions
        if (request.url.includes('logout') || request.url.includes('login')) {
          return throwError(() => err);
        }

        if (err instanceof HttpErrorResponse) {

          // If service worker is not enabled then the status is 0.
          // If service worker is enabled then the status is 504.
          // So set the network status to offline for 0 and 504.
          this.pagesDataService.setNetworkStatus(
            err.status === 0 || err.status === 504 ? NetworkStatusTypeEnum.OFFLINE : NetworkStatusTypeEnum.ONLINE
          );

          // If error is forbidden resource then user session expired or was removed by the API, so remove user data.
          // This will cause the AppComponent to redirect to login page.
          if (err.status === 403) {
            this.authService.removeUser();
            // TODO. check why this doesn't work. This implementation has been done in app component.
            //this.router.createUrlTree(['../../login', { relativeTo: this.activatedRoute }]);
          }
        }

        // Return the error as it is
        return throwError(() => err);
      }),
      tap(response => {
        if (response instanceof HttpResponse) {
          this.pagesDataService.setNetworkStatus(NetworkStatusTypeEnum.ONLINE);
        }

      }),
    );
  }

  public static handleError(err: HttpErrorResponse) {
    if (AppAuthInterceptor.isKnownNetworkError(err)) {
      // A client-side or network error occurred. Handle it accordingly.
      console.log(`Network error ${err.status} was detected`);
      // Return an observable with a user-facing error message.
      return throwError(() => new Error(`Network error ${err.status} was detected`));
    }else {
      // The backend returned an unsuccessful response code for instance status 500 for internal server error.
      // The response body may contain clues as to what went wrong.
      console.log(`Backend returned code ${err.status}, body was: `, err.error);
      // Return an observable with a user-facing error message.
      return throwError(() => new Error('Something bad happened. Please try again later'));
    }

  }

  public static isKnownNetworkError(err: HttpErrorResponse): boolean {
    // Error 0 means there was no server response.
    // Error 504 is returned by angular service worker when there is no connection to the server
    // Error 502 indicates a communication problem between two servers on the internet, in this case cloudflare server and on-premise server hosting climsoft. 
    // Error 530 is returned by cloudflare when the server is no connection to the server that has the cloudflare tunnel service
    return err.status === 0 || err.status === 504 || err.status === 502 || err.status === 530;
  }

}
