import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { StationSearchHistoryModel } from '../models/stations-search-history.model';
import { StationCacheModel, StationsCacheService } from '../services/stations-cache-service';
import { take } from 'rxjs';

interface StationSearchModel {
  station: StationCacheModel;
  selected: boolean;
}

@Component({
  selector: 'app-stations-search-dialog',
  templateUrl: './stations-search-dialog.component.html',
  styleUrls: ['./stations-search-dialog.component.scss']
})
export class StationsSearchDialogComponent {

  @Output()
  public searchedIdsChange = new EventEmitter<string[]>();

  protected open: boolean = false;
  protected activeTab: 'new' | 'history' = 'history';
  protected previousSearches!: StationSearchHistoryModel[];
  protected stationsSelections!: StationSearchModel[];
  protected searchedIds: string[] = [];
  protected searchName: string = '';
  protected saveSearch: boolean = false;

  constructor(private stationsCacheService: StationsCacheService) { 
    console.log('dialog initialised')
  }

  public openDialog(): void {
    this.loadSearchHistory();
    this.open = true;
  }
 
  private async loadSearchHistory(): Promise<void> {
    this.previousSearches = await AppDatabase.instance.stationsSearchHistory.toArray();
  }

  protected onTabChange(selectedTab: 'new' | 'history'): void {
    this.searchedIds = [];
    this.searchName = '';
    this.saveSearch = false;
    if(selectedTab === 'new'){
      this.loadStationSelections();
    }
   
    this.activeTab = selectedTab;
   }

  protected onPreviousSearchSelected(selectedSearch: StationSearchHistoryModel): void {
    this.searchedIds = selectedSearch.stationIds;
    this.searchName = selectedSearch.name;
  }

  protected onEditPreviousSearch(selectedSearch: StationSearchHistoryModel): void {
    this.onIdsSelected(selectedSearch.stationIds);
    this.onSearchNameInput(selectedSearch.name);
    this.saveSearch = selectedSearch.name ? true : false;

    this.loadStationSelections();
    this.sortStationSelectionBySelected();
    this.activeTab = 'new';
  }

  protected async onDeletePreviousSearch(selectedSearch: StationSearchHistoryModel): Promise<void> {
    await AppDatabase.instance.stationsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

  private loadStationSelections(): void {
    this.stationsCacheService.cachedStations.pipe(take(1)).subscribe(stations => {
      this.stationsSelections = stations.map(station => {
        return {
          station: station,
          selected: this.searchedIds.includes(station.id),
        };
      });
    });
  }

  protected onSearchInput(searchValue: string): void {
    // Make the searched items be the first items
    this.stationsSelections.sort((a, b) => {
      // If search is found, move it before `b`, otherwise after
      if (a.station.id.toLowerCase().includes(searchValue)
        || a.station.name.toLowerCase().includes(searchValue)
        || a.station.wmoId.toLowerCase().includes(searchValue)
        || a.station.wigosId.toLowerCase().includes(searchValue)
        || a.station.icaoId.toLowerCase().includes(searchValue)) {
        return -1;
      }
      return 1;
    });
  }

  protected onOptionClick(options: 'Filter' | 'Select All' | 'Deselect All' | 'Sort Selected'): void {
    switch (options) {
      case 'Filter':
        // TODO
        break;
      case 'Select All':
        this.selectAll(true);
        break;
      case 'Deselect All':
        this.selectAll(false);
        break;
      case 'Sort Selected':
        this.sortStationSelectionBySelected();
        break;
      default:
        break;
    }

  }

  protected onStationSelected(stationSelection: StationSearchModel): void {
    stationSelection.selected = !stationSelection.selected;
    this.setSearchedIdsFromStationSelections()
  }

  private selectAll(select: boolean): void {
    for (const item of this.stationsSelections) {
      item.selected = select;
    }

    this.setSearchedIdsFromStationSelections()
  }

  private sortStationSelectionBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.stationsSelections.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private setSearchedIdsFromStationSelections(): void {
    this.onIdsSelected(this.stationsSelections.filter(item => item.selected).map(item => item.station.id));
  }

  private onIdsSelected(searchedIds: string[]): void {
    this.searchedIds = searchedIds;
  }

  protected onSearchNameInput(searchName: string): void {
    this.searchName = searchName;
  }

  protected onOkClick(): void {
    if (this.searchedIds.length > 0 && this.searchName) {
      AppDatabase.instance.stationsSearchHistory.put({ name: this.searchName, stationIds: this.searchedIds });
    }

    this.searchedIdsChange.emit(this.searchedIds);
  }

}
