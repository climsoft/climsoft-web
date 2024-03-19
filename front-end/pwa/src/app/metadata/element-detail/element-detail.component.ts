import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UpdateElementModel } from 'src/app/core/models/update-element.model';
import { ViewElementModel } from 'src/app/core/models/view-element.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-element-detail',
  templateUrl: './element-detail.component.html',
  styleUrls: ['./element-detail.component.scss']
})
export class ElementDetailComponent implements OnInit {
  element!: ViewElementModel;
  bEnableSave: boolean = true;//todo. should be false by default

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private elementsService: ElementsService,
    private location: Location,
  ) {
    this.pagesDataService.setPageHeader("Element Detail");
  }

  ngOnInit() {

    const elementId = this.route.snapshot.params["id"]; 
    if (StringUtils.containsNumbersOnly(elementId)) {
      this.elementsService.getElement(elementId).subscribe((data) => {
        this.element = data;
      });
    } else {
      // TODO. show an error.
    }

  }

  protected onSaveClick(): void {
    // TODO. do validations

    const updatedElement: UpdateElementModel = {
      lowerLimit: this.element.lowerLimit,
      upperLimit: this.element.upperLimit,
      entryScaleFactor: this.element.entryScaleFactor,
      comment: this.element.comment

    }

    this.elementsService.update(this.element.id, updatedElement).subscribe((data) => {
      if (data) {
        this.element = data;

        this.pagesDataService.showToast({
          title: 'Element Details', message: `${this.element.name} saved`, type: 'success'
        });

        this.location.back();
      }

    });

  }

  protected onCancelClick(): void {
    this.location.back();
  }

}
