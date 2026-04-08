import { Component, OnDestroy } from '@angular/core';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { Subject } from 'rxjs';
import { StationCacheModel } from 'src/app/metadata/stations/services/stations-cache.service';
import { DataAvailabilityFilterModel } from './data-availability-filter-selection-general/data-availability-filter-selection-general.component';

@Component({
  selector: 'app-data-availability',
  templateUrl: './data-availability.component.html',
  styleUrls: ['./data-availability.component.scss']
})
export class DataAvailabilityComponent implements  OnDestroy {
  protected stationsPermitted!: StationCacheModel[];
  protected activeTab: 'summary' | 'details' = 'summary';
  protected detailsFilter!: DataAvailabilityFilterModel;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
  ) {
    this.pagesDataService.setPageHeader('Data Availability');
 
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onTabClick(selectedTab: 'summary' | 'details'): void {
    this.activeTab = selectedTab;
  }

}

