import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, take } from 'rxjs';
import { ElementDomainEnum } from 'src/app/core/models/elements/element-domain.enum';
import { UpdateElementModel } from 'src/app/core/models/elements/update-element.model';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-element-detail',
  templateUrl: './element-detail.component.html',
  styleUrls: ['./element-detail.component.scss']
})
export class ElementDetailComponent implements OnInit {
  protected element!: ViewElementModel;
  protected bNew: boolean = false;
  protected bEnableSave: boolean = true;//todo. should be false by default

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
      this.elementsService.findOne(elementId).subscribe((data) => {
        this.element = data;
        this.bNew = false;
      });
    } else {
      this.element = { id: 0, abbreviation: '', name: '', description: '', units: '', typeId: 0, typeName: '', lowerLimit: null, upperLimit: null, entryScaleFactor: null, comment: null, subdomainName: '', domain: ElementDomainEnum.ATMOSPHERE };
      this.bNew = true;
    }

  }

  protected onElementIdEntry(id: number | null): void {
    if (id) {
      this.element.id = id
    }
  }

  protected onTypeChange(typeId: number | null): void {
    if (typeId) {
      this.element.typeId = typeId;
    }
  }

  protected onSave(): void {

    // TODO. do validations

    const updatedElement: UpdateElementModel = {
      name: this.element.name,
      abbreviation: this.element.abbreviation,
      description: this.element.description,
      units: this.element.units,
      typeId: this.element.typeId,
      lowerLimit: this.element.lowerLimit,
      upperLimit: this.element.upperLimit,
      entryScaleFactor: this.element.entryScaleFactor,
      comment: this.element.comment
    }

    let saveSubscription: Observable<ViewElementModel>;
    if (this.bNew) {
      saveSubscription = this.elementsService.create({ ...updatedElement, id: this.element.id });
    } else {
      saveSubscription = this.elementsService.update(this.element.id, updatedElement);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.element = data;
        this.pagesDataService.showToast({
          title: 'Element Details', message: `${this.element.name} saved`, type: 'success'
        });

        this.location.back();
      }

    });

  }

  protected onDelete(): void {
    this.elementsService.delete(this.element.id).pipe(take(1)).subscribe(data => {
      if (data) {
        this.pagesDataService.showToast({ title: "Element Deleted", message: `Element ${this.element.name} deleted`, type: "success" });
        this.location.back();
      }
    });

  }

  protected onCancel(): void {
    this.location.back();
  }

}
