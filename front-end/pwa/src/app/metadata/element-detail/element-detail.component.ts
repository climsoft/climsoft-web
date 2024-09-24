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

  protected onDelete(): void {
    // TODO. Show 'are you sure' subdialog first 
    this.elementsService.delete(this.element.id).pipe(take(1)).subscribe(data => {
      if (data) {
        this.pagesDataService.showToast({ title: "Element Deleted", message: `Element ${this.element.name} deleted`, type: "success" });
        this.location.back();
      }
    });
  }


}
