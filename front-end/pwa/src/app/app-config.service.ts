import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private _apiBaseUrl: string;

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Below code was commented out on 19/09/2025 because of PWA required capability.
    // Get the configurations from the appConfig global variable. 
    // The appConfig variale is set when the application is launched (main.ts  ) 
    // const appConfig = (window as any).appConfig;

    //console.log('origin url: ', this.document.location.origin);

    // if(appConfig && appConfig.apiBaseUrl && (appConfig.apiBaseUrl as string).includes('use_document_location') ){
    //   this._apiBaseUrl = `${this.document.location.origin}/api`;
    // }else{
    //   this._apiBaseUrl = appConfig?.apiBaseUrl || '';
    // }

    // console.log('API url: ', this._apiBaseUrl );

    // Because of PWA required capability. Just always use the document location
    console.log('origin url: ', this.document.location.origin);
    // this.document.location.origin === 'http://localhost:4200'
    if (isDevMode()) { // TODO. Test this to make sure that ng build always returns the correct environment mode: development or production
      this._apiBaseUrl = `http://localhost:3000`;
    } else {
      this._apiBaseUrl = `${this.document.location.origin}/api`;
    }
    console.log('API url: ', this._apiBaseUrl);
  }

  public get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }
}
