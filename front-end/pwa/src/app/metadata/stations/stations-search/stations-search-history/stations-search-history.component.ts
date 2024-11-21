import { Component } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { StationSearchHistoryModel } from '../../models/stations-search-history.model';

@Component({
  selector: 'app-stations-search-history',
  templateUrl: './stations-search-history.component.html',
  styleUrls: ['./stations-search-history.component.scss']
})
export class StationsSearchHistoryComponent {

  protected previousSearches!: StationSearchHistoryModel[];
  protected selectedSearch!: StationSearchHistoryModel;

  constructor() {
    this.loadSearchHistory();
  }


  private async loadSearchHistory() {
    this.previousSearches = await AppDatabase.instance.stationsSearchHistory.toArray();

    console.log('previousSearches', this.previousSearches)
  }

  protected onSelectedValue(selectedSearch: StationSearchHistoryModel) {
    this.selectedSearch = selectedSearch;
  }



}
