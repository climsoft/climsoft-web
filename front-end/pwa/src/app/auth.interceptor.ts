import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, exhaustMap, take, throwError } from 'rxjs'; 
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router, private activatedRoute: ActivatedRoute) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    const modifiedReq = request.clone({ withCredentials: true });

    return next.handle(modifiedReq).pipe(catchError(error => {

      //exclude these 2 urls to avoid race conditions
      if(request.url.includes('logout') || request.url.includes('login')){
        return throwError(() => error)
      }

      let foundSessionExpiredError: boolean = false;    

      if (error instanceof HttpErrorResponse && error.status === 403) {
        foundSessionExpiredError = true; 
        this.authService.removeUser();
        // TODO. check why this doesn't work. This implementation has been done in app component.
        //this.router.createUrlTree(['../../login', { relativeTo: this.activatedRoute }]);
      }

      //if it's NOT a session expiry error then update the user expiry date and save
      if (!foundSessionExpiredError) {
        this.authService.updateUserExpiryDateAndSave();
      }

      return throwError(() => error)
    }));
  }
}
