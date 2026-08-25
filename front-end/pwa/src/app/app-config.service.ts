import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private _apiBaseUrl: string;
  private _supersetBaseUrl: string;

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
    // Same in dev and prod: both now sit behind an nginx origin that proxies
    // /api and /superset (docker-compose.dev.yaml's climsoft_nginx_proxy,
    // localhost:8080 by default, mirrors nginx.conf's routing for dev), so
    // there's no need to special-case isDevMode() here anymore.
    this._apiBaseUrl = `${this.document.location.origin}/api`;
    this._supersetBaseUrl = `${this.document.location.origin}/superset`;
    console.log('API url: ', this._apiBaseUrl);
  }

  public get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

  public get supersetBaseUrl(): string {
    return this._supersetBaseUrl;
  }
}
