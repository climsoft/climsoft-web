import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-view-connectors',
  templateUrl: './view-connectors.component.html',
  styleUrls: ['./view-connectors.component.scss']
})
export class ViewConnectorsComponent  {

  
  private destroy$ = new Subject<void>();

  constructor(private pagesService: PagesDataService){
    this.pagesService.setPageHeader('Connectors');
  }
  
}
