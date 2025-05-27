import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { StationSearchHistoryModel } from '../models/stations-search-history.model';
import { StationCacheModel, StationsCacheService } from '../services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';
import { ViewportService, ViewPortSize } from 'src/app/core/services/view-port.service';

export enum SelectionOptionTypeEnum {
  SELECT_ALL = 'Select All',
  DESELECT_ALL = 'Deselect All',
  SORT_SELECTED = 'Sort Selected',
}

@Component({
  selector: 'app-stations-search-dialog',
  templateUrl: './stations-search-dialog.component.html',
  styleUrls: ['./stations-search-dialog.component.scss']
})
export class StationsSearchDialogComponent implements OnDestroy {
  @Output()
  public searchedIdsChange = new EventEmitter<string[]>();

  protected open: boolean = false;
  protected activeTab: 'new' | 'history' = 'history';
  protected previousSearches!: StationSearchHistoryModel[];
  protected searchName: string = '';
  protected saveSearch: boolean = false;
  protected searchBy: string = 'Id or Name';
  protected searchValue: string = '';

  // Note. Angular does not call ngOnChanges() if the input value doesn’t change by reference across detection cycles.
  // So use object for selection to enforce change detection. This is required for instance when sort selection is clicked several times.
  protected selectionOption!: { value: SelectionOptionTypeEnum };

  protected allStations: StationCacheModel[] = [];
  protected stations: StationCacheModel[] = [];
  protected searchedIds: string[] = [];
  protected searchedStations: StationCacheModel[] = [];
  protected largeScreen: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private viewPortService: ViewportService,
    private stationsCacheService: StationsCacheService) {
    this.viewPortService.viewPortSize.pipe(
      takeUntil(this.destroy$),
    ).subscribe((viewPortSize) => {
      this.largeScreen = viewPortSize === ViewPortSize.LARGE;
    });

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(stations => {
      this.allStations = stations;
      console.log('all stations loaded')
    });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public showDialog(selectedIds?: string[], includeOnlyIds?: string[]): void {
    this.open = true;
    this.stations = includeOnlyIds && includeOnlyIds.length > 0 ? this.allStations.filter(item => includeOnlyIds.includes(item.id)) : this.allStations;

    // Set selected ids from a new copy of the array not same reference array
    // This makes sure that controls that call the dialog are not affect by how the dialog internally manipulates searched ids
    this.setSearchedIds(selectedIds ? [...selectedIds] : []);
    if (this.searchedIds.length > 0) {
      this.activeTab = 'new';
      this.searchBy = 'Id or Name';
    } else {
      this.loadSearchHistory();
    }
  }

  private async loadSearchHistory(): Promise<void> {
    this.previousSearches = await AppDatabase.instance.stationsSearchHistory.toArray();
  }

  protected onTabChange(selectedTab: 'new' | 'history'): void {
    this.searchName = '';
    this.saveSearch = false;
    this.setSearchedIds([]);
    this.activeTab = selectedTab;
    if (this.activeTab === 'history') this.loadSearchHistory();
  }

  protected onPreviousSearchSelected(selectedSearch: StationSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.setSearchedIds(selectedSearch.stationIds);
  }

  protected onEditPreviousSearch(selectedSearch: StationSearchHistoryModel): void {
    this.searchBy = 'Id or Name';
    this.searchName = selectedSearch.name;
    this.saveSearch = selectedSearch.name ? true : false;
    this.setSearchedIds(selectedSearch.stationIds);
    this.activeTab = 'new';
  }

  protected async onDeletePreviousSearch(selectedSearch: StationSearchHistoryModel): Promise<void> {
    await AppDatabase.instance.stationsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

  protected onSearchOptionChange(option: string): void {
    this.searchBy = option;
    this.setSearchedIds([]);
  }

  protected onSearchInput(searchValue: string): void {
    // Using set timeout to improve typing UX of the search especially for devices like tablets and phones
    setTimeout(() => {
      this.searchValue = searchValue.toLowerCase();
    }, 0);

  }

  protected onOptionClick(options: 'Select All' | 'Deselect All' | 'Sort Selected'): void {
    switch (options) {
      case 'Select All':
        this.selectionOption = { value: SelectionOptionTypeEnum.SELECT_ALL };
        break;
      case 'Deselect All':
        this.selectionOption = { value: SelectionOptionTypeEnum.DESELECT_ALL };
        break;
      case 'Sort Selected':
        this.selectionOption = { value: SelectionOptionTypeEnum.SORT_SELECTED };
        break;
      default:
        break;
    }

  }

  protected onOkClick(): void {
    if (this.searchName && this.searchedIds.length > 0) {
      AppDatabase.instance.stationsSearchHistory.put({ name: this.searchName, stationIds: this.searchedIds });
    }
    this.searchedIdsChange.emit(this.searchedIds);
  }

  protected setSearchedIds(searchedIds: string[]): void {
    this.searchedIds = searchedIds;

    // Set searched stations for the map
    const searchedStations: StationCacheModel[] = [];
    for (const station of this.stations) {
      if (this.searchedIds.includes(station.id)) {
        searchedStations.push(station);
      }
    }
    this.searchedStations = searchedStations;
  }

}
