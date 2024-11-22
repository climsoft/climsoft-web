import { Component } from '@angular/core';
import { AppAuthService } from '../../app-auth.service';
import { catchError, of, take } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  protected email: string = ''; //TODO. In future, this could be phone as well
  protected password: string = '';
  protected errorMessage: string = '';

  constructor(private authService: AppAuthService, private router: Router) { }

  protected login(): void {

    this.errorMessage = '';

    if (!this.email) {
      this.errorMessage = 'Email is required';
      return;
    }

    //TODO. make more password validations like number of characters etc
    if (!this.password) {
      this.errorMessage = 'Password is required';
      return;
    }

    this.authService.login(this.email, this.password).pipe(
      take(1),
      catchError(error => {
        this.errorMessage = error.message;
        return of(null);
      })
    ).subscribe(data => {
      if (data) {
        this.router.navigate(['/']);
      }
    });


  }
}
