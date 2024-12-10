import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  private climsoftVersion: string = "climsoft";
  private storage: Storage | null;

  constructor() {
    if (typeof (Storage) !== "undefined") {
      this.storage = window.localStorage;//use the localstorage javascript api
    } else {
      // No web storage Support. //todo. Probably fall back to in memory?
      this.storage = null;
    }
  }

  public getItem<T>(strkey: string): T | null {
    if (this.storage !== null) {
      //local storage can only store strings
      const item = this.storage.getItem(this.climsoftVersion + strkey)
      return item ? JSON.parse(item) : null;
    } else {
      return null;
    }

  }

  public setItem<T>(strkey: string, strValue: T): boolean {
    if (this.storage !== null) {
      //local storage can only store strings
      this.storage.setItem(this.climsoftVersion + strkey, JSON.stringify(strValue));
      return true;
    } else {
      return false;
    }

  }

  public itemExists(strkey: string): boolean {
    if (this.getItem(strkey) === null) {
      return false;
    } else {
      return true;
    }
  }
}
