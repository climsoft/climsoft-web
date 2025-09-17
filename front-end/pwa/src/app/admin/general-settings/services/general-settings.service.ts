import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, Subscription, tap, throwError } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { CreateViewGeneralSettingModel } from '../models/create-view-general-setting.model';
import { UpdateGeneralSettingModel } from '../models/update-general-setting.model';
import { SettingIdEnum } from '../models/setting-id.enum';
import { AppDatabase } from 'src/app/app-database';
import { MetadataUpdatesService } from 'src/app/metadata/metadata-updates/metadata-updates.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralSettingsService {
  private endPointUrl: string;
  private readonly _cachedGeneralSettings: BehaviorSubject<CreateViewGeneralSettingModel[]> = new BehaviorSubject<CreateViewGeneralSettingModel[]>([]);
  private checkUpdatesSubscription: Subscription = new Subscription();
  private checkingForUpdates: boolean = false;

  constructor(
    private appConfigService: AppConfigService,
    private metadataUpdatesService: MetadataUpdatesService,
    private http: HttpClient) {
    this.endPointUrl = `${this.appConfigService.apiBaseUrl}/general-settings`;
    this.loadGeneralSettings();
  }

  private async loadGeneralSettings() {
    this._cachedGeneralSettings.next(await AppDatabase.instance.generalSettings.toArray());
  }

  public checkForUpdates(): void {
    // If still checking for updates just return
    if (this.checkingForUpdates) return;

    console.log('checking general settings updates');
    this.checkingForUpdates = true;
    this.checkUpdatesSubscription.unsubscribe();
    this.checkUpdatesSubscription = this.metadataUpdatesService.checkUpdates('generalSettings').subscribe({
      next: res => {
        console.log('general-settings-cache response', res);
        this.checkingForUpdates = false;
        if (res) {
          this.loadGeneralSettings();
        }
      },
      error: err => {
        this.checkingForUpdates = false;
      }
    });
  }

  public get cachedGeneralSettings(): Observable<CreateViewGeneralSettingModel[]> {
    this.checkForUpdates();
    return this._cachedGeneralSettings.asObservable();
  }

  public findOne(id: SettingIdEnum): Observable<CreateViewGeneralSettingModel | undefined> {
    return this.cachedGeneralSettings.pipe(
      map(settings => {
        return settings.find(item => item.id === id);
      })
    );
  }

  public update(id: number, updateDto: UpdateGeneralSettingModel): Observable<CreateViewGeneralSettingModel> {
    return this.http.patch<CreateViewGeneralSettingModel>(`${this.endPointUrl}/${id}`, updateDto)
      .pipe(
        tap(() => {
          this.checkForUpdates();
        }),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {

    //console.log('auth error', error)

    if (error.status === 0) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(`Backend returned code ${error.status}, body was: `, error.error);
    }
    // Return an observable with a user-facing error message.
    return throwError(() => new Error('Something bad happened. please try again later.'));
  }

}
