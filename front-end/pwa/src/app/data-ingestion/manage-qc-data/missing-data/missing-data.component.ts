import { Component } from '@angular/core';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-missing-data',
  templateUrl: './missing-data.component.html',
  styleUrls: ['./missing-data.component.scss']
})
export class MissingDataComponent {
  constructor(private pageService: PagesDataService) {
    //this.pageService.setPageHeader("Missing Data");
  }
}
