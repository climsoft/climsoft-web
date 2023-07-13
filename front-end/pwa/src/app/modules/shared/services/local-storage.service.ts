import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  private storagePath: string = "climsoft";
  private storage: Storage | null;
​
  constructor() {
    if (typeof (Storage) !== "undefined") {
      this.storage = window.localStorage;//use the localstorage javascript api
    } else {
      // No web storage Support. //todo. Probably fall back to in memory?
      this.storage = null;
    }
  }
​
  public getItem(strkey: string): string | null {
    if (this.storage != null) {
      //local storage can only store strings
      return this.storage.getItem(this.storagePath + strkey);
    } else {
      return null;
    }
​
  }
​
  public setItem(strkey: string, strValue: string): boolean {
    if (this.storage != null) {
      //local storage can only store strings
      this.storage.setItem(this.storagePath + strkey, strValue);
      return true;
    } else {
      return false;
    }
​
  }
​
  public itemExists(strkey: string): boolean {
    if (this.getItem(strkey) === null) {
      return false;
    } else {
      return true;
    }
  }
}
