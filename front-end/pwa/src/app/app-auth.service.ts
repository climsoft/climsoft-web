import { Injectable } from '@angular/core';
import { LoggedInUserModel } from './admin/users/models/logged-in-user.model';
import { BehaviorSubject, catchError, tap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AppConfigService } from './app-config.service';
import { AppDatabase, UserSettingEnum } from './app-database';

@Injectable({
  providedIn: 'root'
})
export class AppAuthService {
  private _user: BehaviorSubject<LoggedInUserModel | null> = new BehaviorSubject<LoggedInUserModel | null>(null);
  private endPointUrl: string;

  constructor(
    private appConfigService: AppConfigService,
    private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/users`;
  }

  public get user() {
    return this._user.asObservable();
  }

  public async setLoggedInUserFromLocalDB(): Promise<void> {
    const user = await AppDatabase.instance.userSettings.get(UserSettingEnum.USER_PROFILE);
    if (user) {
      this._user.next(user.parameters);
    }
  }

  public login(email: string, password: string) {
    return this.http.post<LoggedInUserModel>(`${this.endPointUrl}/login`, { email: email, password: password })
      .pipe(
        tap((data) => {
          this.saveLoggedInUser(data);
        }),
        catchError((error) => this.handleError(error)),
      );
  }

  private saveLoggedInUser(loggedInUser: LoggedInUserModel): void {
    // Save the user data
    AppDatabase.instance.userSettings.put({ name: UserSettingEnum.USER_PROFILE, parameters: loggedInUser });
    this._user.next(loggedInUser)
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


  public removeUser() {
    AppDatabase.instance.userSettings.delete(UserSettingEnum.USER_PROFILE);
    this._user.next(null);
  }


  private handleError(error: HttpErrorResponse) {
    let errorMessage: string = 'An unknown error occurred. Please try again later.';
    if (error.error && error.error.message) {
      switch (error.error.message) {
        case 'invalid_credentials':
          errorMessage = 'Wrong email or password';
          break;
        case 'disabled':
          errorMessage = 'Contact administrator for system access';
          break;
      }
    }

    return throwError(() => new Error(errorMessage));
  }



}
