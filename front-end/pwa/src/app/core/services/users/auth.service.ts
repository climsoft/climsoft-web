import { Injectable } from '@angular/core';
import { LoggedInUserModel } from '../../models/users/logged-in-user.model';
import { BehaviorSubject, catchError, tap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user: BehaviorSubject<LoggedInUserModel | null> = new BehaviorSubject<LoggedInUserModel | null>(null);

  private endPointUrl: string = "http://localhost:3000/users";

  constructor(private http: HttpClient) {
    this.autoLogin();
  }

  public get user() {
    return this._user;
  }

  private autoLogin(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this._user.next(JSON.parse(user));
    }
  }

  public login(email: string, password: string) {
    return this.http.post<LoggedInUserModel>(`${this.endPointUrl}/login`, { email: email, password: password })
      .pipe(
        tap((data) => this.handleAuthentication(data)),
        catchError((error) => this.handleError(error)),       
      );
  }

  public logout() {
    return this.http.post<LoggedInUserModel>(`${this.endPointUrl}/logout`, {})
      .pipe(
        catchError((error) => this.handleError(error)),
        tap((data) => {

          console.log('logout data', data);



          this.removeUser();
        })
      );
  }

  private handleAuthentication(loggedInUser: LoggedInUserModel) {
    this.updateUserExpiryDateAndSave(loggedInUser)
    this._user.next(loggedInUser)
  }

  public removeUser() {
    localStorage.removeItem('user');

    this._user.next(null);
  }

  public updateUserExpiryDateAndSave(loggedInUser?: LoggedInUserModel): void {
    if (!loggedInUser && this._user.value) {
      loggedInUser = this._user.value
    }
    if (loggedInUser) {
      //calculate the expiry date based on expires in value that is set in the server 
      loggedInUser.expirationDate = new Date(new Date().getTime() + loggedInUser.expiresIn).getTime();

      //save the user data
      localStorage.setItem('user', JSON.stringify(loggedInUser));
    }

  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage: string = 'An unknown error occurred. Please try again later.';
    if (error.error && error.error.message) {
      switch (error.error.message) {
        case 'invalid_credentials':
          errorMessage = 'Wrong email or password';
      }
    }

    return throwError(() => new Error(errorMessage));
  }



}
