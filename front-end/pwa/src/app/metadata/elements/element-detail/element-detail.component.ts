import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementCacheModel, ElementsCacheService } from '../services/elements-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';

@Component({
  selector: 'app-element-detail',
  templateUrl: './element-detail.component.html',
  styleUrls: ['./element-detail.component.scss']
})
export class ElementDetailComponent implements OnInit, OnDestroy {
  protected element!: ElementCacheModel;
  protected userIsSystemAdmin: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private elementsCacheService: ElementsCacheService,
    private route: ActivatedRoute,
    private location: Location,
  ) {
    this.pagesDataService.setPageHeader("Element Detail");

    // Check on allowed options
    this.appAuthService.user.pipe(
      take(1),
    ).subscribe(user => {
      this.userIsSystemAdmin = user && user.isSystemAdmin ? true : false;
    });
  }

  ngOnInit() {
    const elementId = this.route.snapshot.params["id"];
    this.elementsCacheService.findOne(+elementId).pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      if (data) {
        this.element = data;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onDelete(): void {
    // TODO. Show 'are you sure' subdialog first 
    this.elementsCacheService.delete(this.element.id).pipe(
      take(1)
    ).subscribe(data => {
      if (data) {
        this.pagesDataService.showToast({ title: "Element Deleted", message: `Element ${this.element.name} deleted`, type: ToastEventTypeEnum.SUCCESS });
        this.location.back();
      }
    });
  }


}
