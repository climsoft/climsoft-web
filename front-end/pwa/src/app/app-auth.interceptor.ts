import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AppAuthService } from './app-auth.service';

@Injectable()
export class AppAuthInterceptor implements HttpInterceptor {

  constructor(private authService: AppAuthService, private router: Router, private activatedRoute: ActivatedRoute) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const modifiedReq = request.clone({ withCredentials: true });
    return next.handle(modifiedReq).pipe(
      catchError(error => {
      // If error is from logout or login url then just return to avoid race conditions
      if (request.url.includes('logout') || request.url.includes('login')) {
        return throwError(() => error)
      }

      // Check the type of error
      if (error instanceof HttpErrorResponse && error.status === 403) {
        // If error is forbidden resource then user session expired or was removed by the API so remove user data.
        // So remove user data. This will cause the AppComponent or AuthGuard to redirect to login page.
        this.authService.removeUser();
        // TODO. check why this doesn't work. This implementation has been done in app component.
        //this.router.createUrlTree(['../../login', { relativeTo: this.activatedRoute }]);
      } else {
        //if it's NOT a session expiry error then update the user expiry date and save
        this.authService.updateUserExpiryDateAndSave();
      }

      // Return the error as it is
      return throwError(() => error)
    }));
  }
}
