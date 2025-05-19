import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export enum ToastEventTypeEnum {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "danger",
}

export interface ToastEvent {
  title?: string; // TODO. deprecate this
  message: string;
  type: ToastEventTypeEnum;
}

@Injectable({
  providedIn: 'root'
})
export class PagesDataService {

  private _pageHeader: Subject<string> = new Subject<string>();
  public readonly pageHeader: Observable<string>;

  private _toastEvents: Subject<ToastEvent> = new Subject<ToastEvent>();
  public readonly toastEvents: Observable<ToastEvent>;

  constructor() {
    this.pageHeader = this._pageHeader.asObservable();
    this.toastEvents = this._toastEvents.asObservable();
  }

  public setPageHeader(pageHaderName: string) {
    this._pageHeader.next(pageHaderName);
  }

  public showToast(toastEvent: ToastEvent) {
    this._toastEvents.next(toastEvent);
  }



}
