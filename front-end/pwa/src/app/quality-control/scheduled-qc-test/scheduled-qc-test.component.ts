import { Component } from '@angular/core'; 
import { PagesDataService } from 'src/app/core/services/pages-data.service';
 
@Component({
  selector: 'app-scheduled-qc-test',
  templateUrl: './scheduled-qc-test.component.html',
  styleUrls: ['./scheduled-qc-test.component.scss']
})
export class ScheduledQCTestComponent {

  constructor(
    private pagesDataService: PagesDataService, 
  ) {

    this.pagesDataService.setPageHeader('Scheduled Quality Control Tests');

  }


  protected onViewClick(): void {
    
  }

}
