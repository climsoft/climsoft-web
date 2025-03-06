import { Injectable } from '@angular/core';
import { LoggedInUserModel } from './admin/users/models/logged-in-user.model';
import { BehaviorSubject, catchError, tap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AppConfigService, UserSettingEnum } from './app-config.service';
import { AppDatabase } from './app-database';

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
  private _user: BehaviorSubject<LoggedInUserModel | null> = new BehaviorSubject<LoggedInUserModel | null>(null);
  private endPointUrl: string;

  constructor(private appConfigService: AppConfigService, private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/users`;
    this.autoLogin();
  }

  public get user() {
    return this._user;
  }

  private async autoLogin(): Promise<void> {
    const user = await AppDatabase.instance.userSettings.get(UserSettingEnum.USER_PROFILE);
    if (user) {
      this._user.next(JSON.parse(user.parameters));
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
    AppDatabase.instance.userSettings.delete(UserSettingEnum.USER_PROFILE);
    this._user.next(null);
  }

  // Also called by the app authenticator everytime there is a response
  public updateUserExpiryDateAndSave(loggedInUser?: LoggedInUserModel): void {
    if (!loggedInUser && this._user.value) {
      loggedInUser = this._user.value
    }
    if (loggedInUser) {
      // Calculate the expiry date based on expires in value that is set in the server 
      loggedInUser.expirationDate = new Date(new Date().getTime() + loggedInUser.expiresIn).getTime();

      // Save the user data
      AppDatabase.instance.userSettings.put({ name: UserSettingEnum.USER_PROFILE, parameters: loggedInUser });
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
