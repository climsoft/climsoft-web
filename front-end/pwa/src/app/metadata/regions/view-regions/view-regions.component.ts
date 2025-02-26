import { Component, OnDestroy } from '@angular/core'; 
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { RegionsCacheService } from '../services/regions-cache.service';
import { ViewRegionModel } from 'src/app/core/models/Regions/view-region.model';

@Component({
  selector: 'app-view-regions',
  templateUrl: './view-regions.component.html',
  styleUrls: ['./view-regions.component.scss']
})
export class ViewRegionsComponent implements OnDestroy {

  protected activeTab: 'table' | 'map' = 'table';

  protected regions!: ViewRegionModel[];

  private destroy$ = new Subject<void>();

  protected optionClicked: 'Import' | 'Delete All' | undefined;

  constructor(
    private pagesDataService: PagesDataService,
    private regionsService: RegionsCacheService,
  ) {

    this.pagesDataService.setPageHeader('Regions');

    // Get all sources 
    this.regionsService.cachedRegions.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.regions = data;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onTabClick(selectedTab: 'table' | 'map'): void {
    this.activeTab = selectedTab;
  }

  protected onSearch(): void {
    // TODO.
  }

  protected onOptionsClicked(option: 'Import' | 'Delete All'): void {
    this.optionClicked = option;
    if (option === 'Delete All') {
      this.regionsService.deleteAll().pipe(take(1)).subscribe(data => {
        if (data) {
          this.pagesDataService.showToast({ title: "Regions Deleted", message: `All regions deleted`, type: ToastEventTypeEnum.SUCCESS });
        }
      });
    }
  }

  protected onOptionsDialogClosed(): void {
    this.optionClicked = undefined;
  }



}
