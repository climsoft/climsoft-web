import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private _apiBaseUrl: string;

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Get the configurations from the appConfig global variable. 
    // The appConfig variale is set when the application is launched (main.ts  ) 
    const appConfig = (window as any).appConfig;
   
    console.log('origin url: ', this.document.location.origin);

    if(appConfig && appConfig.apiBaseUrl && (appConfig.apiBaseUrl as string).includes('use_document_location') ){
      this._apiBaseUrl = `${this.document.location.origin}/api`;
    }else{
      this._apiBaseUrl = appConfig?.apiBaseUrl || '';
    }
  
    console.log('API url: ', this._apiBaseUrl );
  }

  public get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

}

export enum UserSettingEnum {
  USER_PROFILE = "user_profile",
  ENTRY_FORM_SETTINGS = "form_settings",
  DATA_CORRECTION_SETTINGS = "data_correction_settings",
}
