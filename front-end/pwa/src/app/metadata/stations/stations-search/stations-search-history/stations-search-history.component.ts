import { Component, EventEmitter, Output } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { StationSearchHistoryModel } from '../../models/stations-search-history.model';

@Component({
  selector: 'app-stations-search-history',
  templateUrl: './stations-search-history.component.html',
  styleUrls: ['./stations-search-history.component.scss']
})
export class StationsSearchHistoryComponent {

  @Output()
  public selectedSearchHistoryChange = new EventEmitter<StationSearchHistoryModel>();

  @Output()
  public editSearchHistory = new EventEmitter<StationSearchHistoryModel>();

  protected previousSearches!: StationSearchHistoryModel[];
  protected selectedSearch!: StationSearchHistoryModel;

  constructor() {
    this.loadSearchHistory();
  }

  private async loadSearchHistory() {
    this.previousSearches = await AppDatabase.instance.stationsSearchHistory.toArray();
  }

  protected onSelectedSearch(selectedSearch: StationSearchHistoryModel) {
    this.selectedSearch = selectedSearch;
    this.selectedSearchHistoryChange.emit(selectedSearch);
  }

  protected onEditSearch(selectedSearch: StationSearchHistoryModel) {
    this.editSearchHistory.emit(selectedSearch);
  }

  protected async onDeleteSearch(selectedSearch: StationSearchHistoryModel) {
    await AppDatabase.instance.stationsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

}
