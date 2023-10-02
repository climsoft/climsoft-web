import { Component } from '@angular/core';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-station-detail',
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.scss']
})
export class StationDetailComponent {

  constructor(private pagesDataService: PagesDataService){
    this.pagesDataService.setPageHeader('Station Detail');
  }

}
