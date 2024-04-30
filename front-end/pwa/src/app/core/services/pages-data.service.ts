import { Injectable } from '@angular/core';
import { Router, NavigationExtras, Navigation, NavigationEnd } from '@angular/router';
import { filter } from "rxjs/operators";
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { BehaviorSubject, Subject, Observable } from 'rxjs';

export interface ToastEvent {
  title: string; 
  message: string; 
  type: 'success' | 'error' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class PagesDataService {

  private _pageHeader: Subject<string> = new Subject<string>();
  readonly pageHeader: Observable<string>;

  private _toastEvents: Subject<ToastEvent> = new Subject<ToastEvent>();
  readonly toastEvents: Observable<ToastEvent>;


  //stores navigation state which is object type {[k: string]: any;}
  //private loadedViewNavigationData$: BehaviorSubject<any> = new BehaviorSubject<any>({});

  constructor(private router: Router, private localStorage: LocalStorageService) {

    this.pageHeader = this._pageHeader.asObservable();
    this.toastEvents = this._toastEvents.asObservable();

    // //router state should be accessed in the constructor
    // this.router.events
    //   .pipe(filter(event => event instanceof NavigationEnd))
    //   .subscribe((event) => {
    //     //todo. there is a bug on reload. find how to fix it

    //     this.setViewNavigationData();
    //   });
  }

  setPageHeader(pageHaderName: string) {
    this._pageHeader.next(pageHaderName);
  }

  showToast(toastEvent: ToastEvent) {
    this._toastEvents.next(toastEvent);
  }




  // private setViewNavigationData(): void {
  //   let navigation: Navigation | null | undefined = this.router.getCurrentNavigation();
  //   if (!navigation || !navigation.extras || !navigation.extras.state) {

  //     //if no navigation state found. Try getting one from the local storage
  //     //this is useful when a user reloads the app. When app is reloaded the navigation results to Null.
  //     //see issue https://github.com/angular/angular/issues/48744
  //     //possible alternatives in https://stackoverflow.com/questions/65580058/how-to-keep-route-parameters-even-page-refresh
  //     //suggest storing the states locally
  //     let componentState: any = this.localStorage.getItem("LOADED_COMPONENT_NAVIGATION_STATE");
  //     if (componentState) {
  //       this.loadedViewNavigationData$.next(JSON.parse(componentState));
  //     } else {
  //       this.loadedViewNavigationData$.next([]);
  //     }
  //     //note. back navigation will still have the above bug.
  //     //this.router.navigate(["home"]);

  //   } else {
  //     this.loadedViewNavigationData$.next(navigation.extras.state);
  //     //save the component navigation state locally. 
  //     this.localStorage.setItem("LOADED_COMPONENT_NAVIGATION_STATE", JSON.stringify(navigation.extras.state));
  //   }


  // }

  // //gets naviagation data 
  // //used by components that want the data in the constructor
  // private getViewNavigationData(): any {
  //   this.setViewNavigationData();
  //   return this.loadedViewNavigationData$.value;
  // }

  // //gets navigation data as observable
  // //used by components that want data after initialisation
  // private get loadedViewNavigationData(): Observable<any> {
  //   return this.loadedViewNavigationData$.asObservable();
  // }



}
