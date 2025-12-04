import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { CreateStationModel } from '../models/create-station.model';
import { OptionEnum } from 'src/app/shared/options.enum';
import { CachedMetadataService } from '../../metadata-updates/cached-metadata.service';

type tab = 'table' | 'geomap' | 'treemap';

@Component({
  selector: 'app-view-stations',
  templateUrl: './view-stations.component.html',
  styleUrls: ['./view-stations.component.scss']
})
export class ViewStationsComponent implements OnDestroy {
  protected activeTab: tab = 'table';
  protected stations!: StationCacheModel[];
  protected searchedIds!: string[];

  protected dropDownItems: OptionEnum[] = [];
  protected optionTypeEnum: typeof OptionEnum = OptionEnum;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private cachedMetadataService: CachedMetadataService,
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

    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
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
      this.cachedMetadataService.stationsMetadata.filter(item => this.searchedIds.includes(item.id)) :
      [...this.cachedMetadataService.stationsMetadata];
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
