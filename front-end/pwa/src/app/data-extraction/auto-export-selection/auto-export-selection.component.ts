import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-auto-export-selection',
  templateUrl: './auto-export-selection.component.html',
  styleUrls: ['./auto-export-selection.component.scss']
})
export class AutoExportSelectionComponent  {

  constructor(private pagesDataService: PagesDataService){
    this.pagesDataService.setPageHeader('Select Scheduled Export');
  }
  
  private destroy$ = new Subject<void>();

  
}
