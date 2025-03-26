import { Component } from '@angular/core';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

type tabTypes = 'station-activity'| 'data-flow' | 'data-explorer';
@Component({
  selector: 'app-manage-data-monitoring',
  templateUrl: './manage-data-monitoring.component.html',
  styleUrls: ['./manage-data-monitoring.component.scss']
})
export class ManageDataMonitoringComponent {

  protected activeTab: tabTypes = 'station-activity';
  protected searchedStationsIds!: string[];

  constructor(private pagesDataService: PagesDataService) {
    this.pagesDataService.setPageHeader('Data Monitoring');
  }

  protected onTabClick(selectedTab: tabTypes): void {
    this.activeTab = selectedTab;
  }

  protected onSearchInput(stationIds: string[]){
    this.searchedStationsIds = stationIds;
  }

}
