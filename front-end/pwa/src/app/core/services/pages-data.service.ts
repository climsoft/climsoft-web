import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export enum ToastEventTypeEnum {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "danger",
}

export enum NetworkStatusTypeEnum {
  ONLINE = "online",
  OFFLINE = "offline",
}

export interface ToastEvent {
  title: string;
  message: string;
  type: ToastEventTypeEnum;
}

@Injectable({
  providedIn: 'root'
})
export class PagesDataService {
  private _pageHeader: Subject<string> = new Subject<string>();
  private _toastEvents: Subject<ToastEvent> = new Subject<ToastEvent>();
  private _networkStatus: Subject<NetworkStatusTypeEnum> = new Subject<NetworkStatusTypeEnum>();

  constructor() { }

  public setPageHeader(pageHaderName: string) {
    this._pageHeader.next(pageHaderName);
  }

  public get pageHeader() {
    return this._pageHeader.asObservable();
  }

  public showToast(toastEvent: ToastEvent) {
    this._toastEvents.next(toastEvent);
  }

  public get toastEvents() {
    return this._toastEvents.asObservable();
  }

  public setNetworkStatus(networkStatusType: NetworkStatusTypeEnum) {
    this._networkStatus.next(networkStatusType);
  }
  public get netWorkStatus() {
    return this._networkStatus.asObservable();
  }



}
