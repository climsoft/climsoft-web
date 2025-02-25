import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-auto-import-selection',
  templateUrl: './auto-import-selection.component.html',
  styleUrls: ['./auto-import-selection.component.scss']
})
export class AutoImportSelectionComponent  {

  private destroy$ = new Subject<void>();

  constructor(private pagesDataService: PagesDataService){
    this.pagesDataService.setPageHeader('Select Auto Import');
  }

  
}
