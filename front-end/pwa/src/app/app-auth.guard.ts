import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRoute, Router } from '@angular/router'; 
import { map, take } from 'rxjs';
import { AppAuthService } from './app-auth.service';

export const appAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AppAuthService);
  const router: Router = inject(Router);
  const activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  return authService.user.pipe(take(1), map(user => { 
    // If user is not logged in, then re-route to log in
    // If user session is expired, then re-route to log in
    // TODO. In future check for the routes as well and prevent user from accessing modules not allowed
    return user && user.expirationDate && user.expirationDate >= new Date().getTime() ? true : router.createUrlTree(['../../login'], {relativeTo: activatedRoute});
  }));

};
