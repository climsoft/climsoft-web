import { Component } from '@angular/core';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-manage-data',
  templateUrl: './manage-data.component.html',
  styleUrls: ['./manage-data.component.scss']
})
export class ManageDataComponent {

  protected activeTab: 'edit' | 'missing' | 'qc' | 'source' | 'deleted' = 'edit';

  constructor(  private pagesDataService: PagesDataService){
    this.pagesDataService.setPageHeader('Manage Data');
  }

  protected onTabClick(selectedTab: 'edit' | 'missing' | 'qc' | 'source' | 'deleted' = 'edit'): void {
    this.activeTab = selectedTab;
  }

}
