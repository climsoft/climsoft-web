import { Injectable } from '@angular/core';
import { Router, NavigationExtras, Navigation, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from "rxjs/operators";
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { BehaviorSubject, Subject, Observable } from 'rxjs';

export interface ToastEvent {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
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
