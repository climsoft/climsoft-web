import { Component } from '@angular/core';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-data-monitoring',
  templateUrl: './data-monitoring.component.html',
  styleUrls: ['./data-monitoring.component.scss']
})
export class DataMonitoringComponent {
  constructor(private pageService: PagesDataService) {
    this.pageService.setPageHeader("Data Monitoring");
  }
}
