import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-elements',
  templateUrl: './elements.component.html',
  styleUrls: ['./elements.component.scss']
})
export class ElementsComponent {
  elements!: ViewElementModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private elementsService: ElementsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Elements Metadata');

    this.elementsService.findAll().pipe(take(1)).subscribe(data => {
      this.elements = data;
    });

  }


  protected onSearch(): void { }

  protected onNewElement(): void {
    this.router.navigate(['element-detail', 'new'], { relativeTo: this.route.parent });
  }

  protected onEditElement(element: ViewElementModel): void {
    this.router.navigate(['element-detail', element.id], { relativeTo: this.route.parent });
  }


}
