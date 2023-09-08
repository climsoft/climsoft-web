import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

//view port sizes supported; 'small', 'large'.
export enum ViewPortSize {
  Small,
  Large
}

@Injectable({
  providedIn: 'root'
})
export class ViewportService {

  private viewPortSize$: BehaviorSubject<ViewPortSize> = new BehaviorSubject<ViewPortSize>(ViewPortSize.Large);

  constructor(private observer: BreakpointObserver) {
    //consider 800px and below breakpoint as a small device
    this.observer.observe(["(max-width: 800px)"]).subscribe((res) => {
      if (res.matches) {
        this.viewPortSize$.next(ViewPortSize.Small)
      } else {
        this.viewPortSize$.next(ViewPortSize.Large);
      }
    });
  }

  public get viewPortSize(): Observable<ViewPortSize> {
    return this.viewPortSize$.asObservable();
  }



}
