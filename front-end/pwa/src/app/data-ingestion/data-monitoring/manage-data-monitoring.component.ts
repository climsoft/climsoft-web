import { Component } from '@angular/core';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

type tabTypes = 'station-status'| 'view'
@Component({
  selector: 'app-manage-data-monitoring',
  templateUrl: './manage-data-monitoring.component.html',
  styleUrls: ['./manage-data-monitoring.component.scss']
})
export class ManageDataMonitoringComponent {

  protected activeTab: tabTypes = 'station-status';

  constructor(private pagesDataService: PagesDataService) {
    this.pagesDataService.setPageHeader('Quality Control');
  }

  protected onTabClick(selectedTab: tabTypes): void {
    this.activeTab = selectedTab;
  }

}
