import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-view-audits',
  templateUrl: './view-audits.component.html',
  styleUrls: ['./view-audits.component.scss']
})
export class ViewAuditsComponent  {

  
  private destroy$ = new Subject<void>();

  constructor(private pagesService: PagesDataService){
    this.pagesService.setPageHeader('Audits')
  }

  
}
