import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { ElementDomainEnum } from 'src/app/metadata/elements/models/element-domain.enum';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ElementCacheModel, ElementsCacheService } from '../services/elements-cache.service';

@Component({
  selector: 'app-element-detail',
  templateUrl: './element-detail.component.html',
  styleUrls: ['./element-detail.component.scss']
})
export class ElementDetailComponent implements OnInit, OnDestroy {
  protected element!: ElementCacheModel;
  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private elementsCacheService: ElementsCacheService,
    private location: Location,
  ) {

    this.pagesDataService.setPageHeader("Element Detail");
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
        this.pagesDataService.showToast({ title: "Element Deleted", message: `Element ${this.element.name} deleted`, type: "success" });
        this.location.back();
      }
    });
  }


}
