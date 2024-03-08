import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ElementModel } from 'src/app/core/models/element.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-element-detail',
  templateUrl: './element-detail.component.html',
  styleUrls: ['./element-detail.component.scss']
})
export class ElementDetailComponent implements OnInit {
  element!: ElementModel;
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
    //console.log("element id", elementId)
    if (StringUtils.containsNumbersOnly(elementId)) {
      this.elementsService.getElement(elementId).subscribe((data) => {
        this.element = data;
      });
    } else {
      this.element = { id: 0, name: '', abbreviation: '', description: '', typeId: 1, lowerLimit: null, upperLimit: null, entryScaleFactor: null, comment: null };
    }

  }

  protected onElementIdEntry(id: number | null) {
    if (id) {
      this.element.id = id
    }

  }

  protected onSaveClick(): void {
    //todo. do validations

    this.elementsService.save([this.element]).subscribe((data) => {
      if (data.length > 0) {
        this.element = data[0];

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
