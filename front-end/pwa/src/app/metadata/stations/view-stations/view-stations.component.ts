import { Component, OnDestroy } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { OptionEnum } from 'src/app/shared/options.enum';

type tab = 'table' | 'geomap' | 'treemap';

@Component({
  selector: 'app-view-stations',
  templateUrl: './view-stations.component.html',
  styleUrls: ['./view-stations.component.scss']
})
export class ViewStationsComponent implements OnDestroy {
  protected activeTab: tab = 'table';
  protected allStations: StationCacheModel[] = [];
  protected stations: StationCacheModel[] = [];
  protected searchedIds: string[] = [];

  protected dropDownItems: OptionEnum[] = [];
  protected optionTypeEnum: typeof OptionEnum = OptionEnum;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private stationsCacheService: StationsCacheService,) {

    this.pagesDataService.setPageHeader('Stations');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
      this.dropDownItems = [OptionEnum.SORT_BY_ID, OptionEnum.SORT_BY_NAME, OptionEnum.DOWNLOAD];
      if (this.isSystemAdmin) {
        this.dropDownItems.push(OptionEnum.DELETE_ALL);
      }
    });

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allStations = data;
      // Always call filtered seacrh ids because when the caches refreshes, the selected ids will not be the ones shown
      this.filterSearchedIds();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onTabClick(selectedTab: tab): void {
    this.activeTab = selectedTab;
  }

  protected onSearchInput(searchedIds: string[]): void {
    this.searchedIds = searchedIds;
    this.filterSearchedIds();
  }

  private filterSearchedIds(): void {
    this.stations = this.searchedIds && this.searchedIds.length > 0 ?
      this.allStations.filter(item => this.searchedIds.includes(item.id)) : [...this.allStations];
  }

  protected onOptionsClick(option: OptionEnum): void {
    switch (option) {
      case OptionEnum.SORT_BY_ID:
        this.stations.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case OptionEnum.SORT_BY_NAME:
        this.stations.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case OptionEnum.DELETE_ALL:
        // TODO. Check if operation is doable first
        this.stationsCacheService.deleteAll().pipe(
          take(1),
        ).subscribe(data => {
          if (data) {
            this.pagesDataService.showToast({ title: "Stations Deleted", message: `All stations deleted`, type: ToastEventTypeEnum.SUCCESS });
          }
        });
        break;
      default:
        break;
    }
  }

  protected get downloadLink(): string {
    return this.stationsCacheService.downloadLink;
  }

}
