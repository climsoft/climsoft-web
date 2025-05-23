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
      catchError(error => {
        // If error is from logout or login url then just return to avoid race conditions
        if (request.url.includes('logout') || request.url.includes('login')) {
          return throwError(() => error);
        }

        if (error instanceof HttpErrorResponse) {
          // Set the network status
          this.pagesDataService.setNetworkStatus(error.status === 0 ? NetworkStatusTypeEnum.OFFLINE : NetworkStatusTypeEnum.ONLINE);

          if (error.status === 403) {
            // If error is forbidden resource then user session expired or was removed by the API so remove user data.
            // So remove user data. This will cause the AppComponent to redirect to login page.
            this.authService.removeUser();
            // TODO. check why this doesn't work. This implementation has been done in app component.
            //this.router.createUrlTree(['../../login', { relativeTo: this.activatedRoute }]);
          }
        }

        // Return the error as it is
        return throwError(() => error);
      }),
      tap(response => {
        if (response instanceof HttpResponse) {
          this.pagesDataService.setNetworkStatus(NetworkStatusTypeEnum.ONLINE);
        }

      }),
    );
  }
}
