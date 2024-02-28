import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, catchError, of, take, tap } from 'rxjs';
import { LoggedInUserDto } from '../models/dtos/logged-in-user.dto';
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

  constructor(private authService: AuthService, private router: Router) { }

  protected login() {

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
