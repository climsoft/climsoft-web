import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { RegionsService } from 'src/app/core/services/regions/regions.service';
import { ViewRegionsDefinition } from '../view-regions.definition';

@Component({
  selector: 'app-view-regions',
  templateUrl: './view-regions.component.html',
  styleUrls: ['./view-regions.component.scss']
})
export class ViewRegionsComponent {
  protected regionsDef: ViewRegionsDefinition;
  protected activeTab: 'table' | 'map' = 'table';

  constructor(
    private pagesDataService: PagesDataService,
    private router: Router,
    private route: ActivatedRoute,
    private regionsService: RegionsService,
  ) {
    this.pagesDataService.setPageHeader('Regions Metadata');
    this.regionsDef = new ViewRegionsDefinition(this.regionsService);
    this.regionsDef.countEntries();
  }

  protected onTabClick(selectedTab: 'table' | 'map'): void {
    this.activeTab = selectedTab;
  }

  protected onSearch(): void { }

  protected onDeleteAll(): void {
    this.regionsService.deleteAll().pipe(take(1)).subscribe(data => {
      if (data) {
        this.pagesDataService.showToast({ title: "Regions Deleted", message: `${data} regions deleted`, type: "success" });
        this.regionsDef.countEntries();
      }
    });
  }

  protected onImportRegion() {
    this.router.navigate(['import-regions'], { relativeTo: this.route.parent });
  }



}
