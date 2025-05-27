import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { CreateStationModel } from '../models/create-station.model';

type tab = 'table' | 'geomap' | 'treemap';
type optionsType = 'Order By Id' | 'Order By Name' | 'Add' | 'Import' | 'Download' | 'Delete All';

@Component({
  selector: 'app-view-stations',
  templateUrl: './view-stations.component.html',
  styleUrls: ['./view-stations.component.scss']
})
export class ViewStationsComponent implements OnDestroy {
  protected activeTab: tab = 'table';
  private allStations!: StationCacheModel[];
  protected stations!: StationCacheModel[];
  protected searchedIds!: string[];

  protected optionClicked: optionsType | undefined;
  protected dropDownItems: optionsType[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private stationsCacheService: StationsCacheService,
    private router: Router,
    private route: ActivatedRoute) {
    this.pagesDataService.setPageHeader('Stations');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      this.dropDownItems = user && user.isSystemAdmin ? ['Order By Id', 'Order By Name', 'Add', 'Import', 'Download', 'Delete All'] : ['Order By Id', 'Order By Name', 'Download'];
    });

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(stations => {
      this.allStations = stations;
      this.filterBasedOnSearchedIds();
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
    this.filterBasedOnSearchedIds();
  }

  private filterBasedOnSearchedIds(): void {
    this.stations = this.searchedIds && this.searchedIds.length > 0 ? this.allStations.filter(item => this.searchedIds.includes(item.id)) : this.allStations;
  }

  protected onOptionsClick(option: optionsType): void {
    this.optionClicked = option;
    switch (option) {
      case 'Order By Id':
        this.stations = [...this.stations].sort((a, b) => a.id.localeCompare(b.id));
        break;
      case 'Order By Name':
        this.stations = [...this.stations].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'Delete All':
        this.stationsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
          if (data) {
            this.pagesDataService.showToast({ title: "Stations Deleted", message: `All stations deleted`, type: ToastEventTypeEnum.SUCCESS });
          }
        });
        break;
      default:
        break;
    }
  }

  protected onOptionsDialogClosed(): void {
    this.optionClicked = undefined;
  }

  protected onEditStation(station: CreateStationModel) {
    this.router.navigate(['station-detail', station.id], { relativeTo: this.route.parent });
  }

  protected get downloadLink(): string {
    return this.stationsCacheService.downloadLink;
  }

}
