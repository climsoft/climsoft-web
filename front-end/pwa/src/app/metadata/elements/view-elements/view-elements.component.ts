import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-view-elements',
  templateUrl: './view-elements.component.html',
  styleUrls: ['./view-elements.component.scss']
})
export class ViewElementsComponent {
  elements!: ViewElementModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private elementsService: ElementsService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Elements Metadata');
    this.loadElements();
  }

  protected loadElements(): void {
    this.elementsService.findAll().pipe(take(1)).subscribe(data => {
      this.elements = data;
    });
  }

  protected onSearch(): void {
    // TODO.
  }

  protected onImportElements(): void {
    //TODO.
  }

  protected onEditElement(element: ViewElementModel): void {
    this.router.navigate(['element-detail', element.id], { relativeTo: this.route.parent });
  }

}
