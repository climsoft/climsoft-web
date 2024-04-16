import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/** Enum for view port sizes supported; 'small', 'large'. */
export enum ViewPortSize {
  SMALL,
  LARGE
}

@Injectable({
  providedIn: 'root'
})
export class ViewportService {

  private viewPortSize$: BehaviorSubject<ViewPortSize> = new BehaviorSubject<ViewPortSize>(ViewPortSize.LARGE);

  constructor(private observer: BreakpointObserver) {
    //consider 800px and below breakpoint as a small device
    this.observer.observe(["(max-width: 800px)"]).subscribe((res) => {
      this.viewPortSize$.next(res.matches? ViewPortSize.SMALL: ViewPortSize.LARGE)
    });
  }

  public get viewPortSize(): Observable<ViewPortSize> {
    return this.viewPortSize$.asObservable();
  }



}
