import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel } from '../../services/stations-cache.service';
import { SelectionOptionTypeEnum } from '../stations-search-dialog.component';

interface StationSearchModel {
  station: StationCacheModel;
  selected: boolean;
}

@Component({
  selector: 'app-station-id-name-search',
  templateUrl: './station-id-name-search.component.html',
  styleUrls: ['./station-id-name-search.component.scss']
})
export class StationIDNameSearchComponent implements OnChanges {
  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption: SelectionOptionTypeEnum | undefined;
  @Input() public searchedIds!: string[];
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected stationsSelections!: StationSearchModel[];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stations']) {
      this.stationsSelections = this.stations.map(item => {
        return { station: item, selected: false };
      });
    }
    if (changes['searchedIds'] && this.searchedIds && this.stations) {
      for (const selection of this.stationsSelections) {
        selection.selected = this.searchedIds.includes(selection.station.id);
      }
    }

    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.stationsSelections.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.station.id.toLowerCase().includes(this.searchValue)
          || a.station.name.toLowerCase().includes(this.searchValue)
          || a.station.wmoId.toLowerCase().includes(this.searchValue)
          || a.station.wigosId.toLowerCase().includes(this.searchValue)
          || a.station.icaoId.toLowerCase().includes(this.searchValue)) {
          return -1;
        }
        return 1;
      });
    }

    if (changes['selectionOption'] && this.selectionOption) {
      switch (this.selectionOption) {
        case SelectionOptionTypeEnum.SELECT_ALL:
          this.selectAll(true);
          break;
        case SelectionOptionTypeEnum.DESELECT_ALL:
          this.selectAll(false);
          break;
        case SelectionOptionTypeEnum.SORT_SELECTED:
          this.sortBySelected();
          break;
        default:
          break;
      }
    }
  }


  protected onSelected(stationSelection: StationSearchModel): void {
    stationSelection.selected = !stationSelection.selected;
    this.emitSearchedStationIds();
  }


  private selectAll(select: boolean): void {
    for (const item of this.stationsSelections) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.stationsSelections.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private emitSearchedStationIds() {
    this.searchedIds.length = 0;
    for (const station of this.stationsSelections) {
      if (station.selected) this.searchedIds.push(station.station.id)
    }
    this.searchedIdsChange.emit(this.searchedIds);
  }


}
