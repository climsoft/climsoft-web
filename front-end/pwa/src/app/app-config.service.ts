import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {

  private _apiBaseUrl: string;

  constructor() {
    // Get the configurations from the appConfig global variable. 
    // The appConfig variale is set when the application is launched (main.ts  ) 
    const appConfig = (window as any).appConfig;
    this._apiBaseUrl = appConfig?.apiBaseUrl || '';
  }

  public get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }




}
