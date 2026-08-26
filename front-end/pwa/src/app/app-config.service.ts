import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private _apiBaseUrl: string;
  private _supersetBaseUrl: string;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this._apiBaseUrl = `${this.document.location.origin}/api`;
    this._supersetBaseUrl = `${this.document.location.origin}/superset`;
  }

  public get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

  public get supersetBaseUrl(): string {
    return this._supersetBaseUrl;
  }
}
