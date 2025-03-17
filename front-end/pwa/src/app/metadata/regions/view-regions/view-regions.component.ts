import { Component, OnDestroy } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { RegionsCacheService } from '../services/regions-cache.service';
import { ViewRegionModel } from 'src/app/metadata/regions/models/view-region.model';
import { AppAuthService } from 'src/app/app-auth.service';

type optionsType = 'Import' | 'Delete All';

@Component({
  selector: 'app-view-regions',
  templateUrl: './view-regions.component.html',
  styleUrls: ['./view-regions.component.scss']
})
export class ViewRegionsComponent implements OnDestroy {

  protected activeTab: 'table' | 'map' = 'table';

  protected regions!: ViewRegionModel[];

  private destroy$ = new Subject<void>();

  protected optionClicked: optionsType | undefined;
  protected dropDownItems: optionsType[] = [];

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private regionsService: RegionsCacheService,
  ) {

    this.pagesDataService.setPageHeader('Regions');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      this.dropDownItems = user && user.isSystemAdmin ? ['Import', 'Delete All'] : [];
    });

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

  protected onOptionsClicked(option: optionsType): void {
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
