import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { ViewElementQueryModel } from 'src/app/core/models/elements/view-element-query.model';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

@Component({
  selector: 'app-view-elements',
  templateUrl: './view-elements.component.html',
  styleUrls: ['./view-elements.component.scss']
})
export class ViewElementsComponent {
  protected elements!: ViewElementModel[];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected ElementFilter!: ViewElementQueryModel;

  constructor(
    private pagesDataService: PagesDataService,
    private elementsService: ElementsService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Elements Metadata');
    this.countEntries();
  }

  public countEntries(): void {
    this.elements = [];
    this.ElementFilter = {};
    this.pageInputDefinition.setTotalRowCount(0);
    this.elementsService.count(this.ElementFilter).pipe(take(1)).subscribe(count => {
        this.pageInputDefinition.setTotalRowCount(count);
        if (count > 0) {
            this.loadEntries();
        }
    });
}

public loadEntries(): void {
    this.ElementFilter.page = this.pageInputDefinition.page;
    this.ElementFilter.pageSize = this.pageInputDefinition.pageSize;
    this.elementsService.find(this.ElementFilter).pipe(take(1)).subscribe(data => {
        if (data) {
            this.elements = data;
        }
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
