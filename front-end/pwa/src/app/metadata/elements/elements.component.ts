import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ElementModel } from 'src/app/core/models/element.model';
import { ElementsService } from 'src/app/core/services/elements.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-elements',
  templateUrl: './elements.component.html',
  styleUrls: ['./elements.component.scss']
})
export class ElementsComponent {
  elements!: ElementModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private elementsService: ElementsService,
    private router: Router,
    private route: ActivatedRoute) {

    this.pagesDataService.setPageHeader('Elements Metadata');

    this.elementsService.getElements().subscribe(data => {
      this.elements = data;
    });


  }

  ngOnInit() {
  }

  onSearchClick() { }

  onNewElementClick() {
    this.router.navigate(['element-detail', 'new'], { relativeTo: this.route.parent });
  }

  onEditElementClick(element: ElementModel) {
    this.router.navigate(['element-detail', element.id], { relativeTo: this.route.parent });
  }

}
