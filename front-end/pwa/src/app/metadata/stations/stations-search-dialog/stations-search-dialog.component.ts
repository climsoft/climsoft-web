import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { StationSearchHistoryModel } from '../models/stations-search-history.model';
import { StationCacheModel } from '../services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';
import { ViewportService, ViewPortSize } from 'src/app/core/services/view-port.service';
import { CachedMetadataService } from '../../metadata-updates/cached-metadata.service';

export enum SelectionOptionTypeEnum {
  SELECT_ALL,
  DESELECT_ALL,
  SORT_SELECTED,
  SORT_BY_ID,
  SORT_BY_NAME,
}

export enum SearchByOptionEnum {
  ID_NAME = 'Id or Name',
  REGION = 'Region',
  ORGANISATION = "Organisation",
  NETWORK_AFFILIATION = "Network Affiliation",
  STATUS = "Status",
  PROCESSING = "Processing",
  ENVIRONMENT = "Environment",
  FOCUS = "Focus",
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
  protected activeTab!: 'new' | 'history';
  protected previousSearches!: StationSearchHistoryModel[];
  protected searchName: string = '';
  protected saveSearch: boolean = false;
  protected searchByOptionEnum: typeof SearchByOptionEnum = SearchByOptionEnum;
  protected searchBy: SearchByOptionEnum = SearchByOptionEnum.ID_NAME;
  protected searchValue: string = '';

  // Note. Angular does not call ngOnChanges() if the input value doesn’t change by reference across detection cycles.
  // So use object for selection to enforce change detection. 
  // This is required for instance when sort selection is clicked several times.
  protected selectionOption!: { value: SelectionOptionTypeEnum };
  protected selectionOptionTypeEnum: typeof SelectionOptionTypeEnum = SelectionOptionTypeEnum;

  protected stations: StationCacheModel[] = [];
  protected searchedIds: string[] = [];
  protected displayMapviewer: boolean = true; // used to determine whether to show the map viewer

  private destroy$ = new Subject<void>();

  constructor(
    private viewPortService: ViewportService,
    private cachedMetadataService: CachedMetadataService) {
    this.viewPortService.viewPortSize.pipe(
      takeUntil(this.destroy$),
    ).subscribe((viewPortSize) => {
      this.displayMapviewer = viewPortSize === ViewPortSize.LARGE;
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public async showDialog(selectedIds?: string[], includeOnlyIds?: string[]): Promise<void> {
    this.open = true;
    this.stations = includeOnlyIds && includeOnlyIds.length > 0 ?
      this.cachedMetadataService.stationsMetadata.filter(item => includeOnlyIds.includes(item.id)) :
      this.cachedMetadataService.stationsMetadata;

    // Set selected ids from a new copy of the array not same reference array
    // This makes sure that controls that call the dialog are not affect by how the dialog internally manipulates searched ids
    // especially when okay is not clicked
    this.setSearchedIds(selectedIds ? [...selectedIds] : []);
    if (this.searchedIds.length > 0) {
      this.activeTab = 'new';
      this.searchBy = SearchByOptionEnum.ID_NAME;
    } else if (this.activeTab === 'new') {
      this.searchBy = SearchByOptionEnum.ID_NAME;
    } else if (this.activeTab === 'history') {
      this.loadSearchHistory();
    } else {
      // If it's the first time the dialog is being shown then load history 
      // and if not previous searches then just show new tab
      await this.loadSearchHistory();
      if (this.previousSearches.length === 0) {
        this.activeTab = 'new';
        this.searchBy = SearchByOptionEnum.ID_NAME;
      } else {
        this.activeTab = 'history';
      }
    }
  }

  protected onTabClick(selectedTab: 'new' | 'history'): void {
    this.searchName = '';
    this.saveSearch = false;
    // clear the searched ids array
    this.setSearchedIds([]);
    this.activeTab = selectedTab;
    if (this.activeTab === 'history') this.loadSearchHistory();
  }

  private async loadSearchHistory(): Promise<void> {
    this.previousSearches = await AppDatabase.instance.stationsSearchHistory.toArray();
  }

  protected onPreviousSearchSelected(selectedSearch: StationSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.setSearchedIds(selectedSearch.stationIds);
  }

  protected onEditPreviousSearch(selectedSearch: StationSearchHistoryModel): void {
    this.searchBy = SearchByOptionEnum.ID_NAME;
    this.searchName = selectedSearch.name;
    this.saveSearch = true;
    this.setSearchedIds(selectedSearch.stationIds);
    this.activeTab = 'new';
  }

  protected async onDeletePreviousSearch(selectedSearch: StationSearchHistoryModel): Promise<void> {
    await AppDatabase.instance.stationsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

  protected onSearchOptionChange(option: SearchByOptionEnum): void {
    this.searchBy = option;
    this.searchValue = '';
    if (option !== SearchByOptionEnum.ID_NAME) {
      this.setSearchedIds([]);
    }
  }

  protected setSearchedIds(searchedIds: string[]): void {
    // Defer this update to the next change detection cycle to avoid the
    // ExpressionChangedAfterItHasBeenCheckedError. This error occurs when the child
    // component updates the parent's 'searchedIds' property (via an event) during the
    // same change detection cycle in which the parent's view has already been checked.
    setTimeout(() => this.searchedIds = searchedIds, 0);
  }

  protected onSearchInput(newSearchValue: string): void {
    // Using set timeout to improve typing UX of the search especially for devices like tablets and phones
    setTimeout(() => this.searchValue = newSearchValue.toLowerCase(), 0);
  }

  protected onSelectionOptionClick(option: SelectionOptionTypeEnum): void {
    this.selectionOption = { value: option };
  }

  protected onOkClick(): void {
    this.searchName = this.searchName.trim();
    if (this.searchName && this.searchedIds.length > 0) {
      AppDatabase.instance.stationsSearchHistory.put({ name: this.searchName, stationIds: this.searchedIds });
    }
    this.searchedIdsChange.emit(this.searchedIds);
  }

}
