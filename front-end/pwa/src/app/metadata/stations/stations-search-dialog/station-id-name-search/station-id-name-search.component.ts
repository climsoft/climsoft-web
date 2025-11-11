import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('stnIdNameTableContainer') stnIdNameTableContainer!: ElementRef;

  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Input() public inputSearchedIds!: string[];
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected selections!: StationSearchModel[];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stations']) {
      this.selections = this.stations.map(item => {
        return { station: item, selected: false };
      });
    }
    if (changes['inputSearchedIds'] && this.inputSearchedIds && this.stations) {
      console.log('ngOnChanges - searchedIds:', this.inputSearchedIds);
      for (const selection of this.selections) {
        selection.selected = this.inputSearchedIds.includes(selection.station.id);
      }
    }

    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.selections.sort((a, b) => {
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
      this.scrollToTop();
    }

    if (changes['selectionOption'] && this.selectionOption) {
      switch (this.selectionOption.value) {
        case SelectionOptionTypeEnum.SORT_SELECTED:
          // Sort the array so that items with `selected: true` come first
          this.selections.sort((a, b) => {
            if (a.selected === b.selected) {
              return 0; // If both are the same (either true or false), leave their order unchanged
            }
            return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
          });
          this.scrollToTop();
          break;
        case SelectionOptionTypeEnum.SORT_BY_ID:
          this.selections.sort((a, b) => a.station.id.localeCompare(b.station.id));
          this.scrollToTop();
          break;
        case SelectionOptionTypeEnum.SORT_BY_NAME:
          this.selections.sort((a, b) => a.station.name.localeCompare(b.station.name));
          this.scrollToTop();
          break;
        case SelectionOptionTypeEnum.SELECT_ALL:
          this.selectAll(true);
          break;
        case SelectionOptionTypeEnum.DESELECT_ALL:
          this.selectAll(false);
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
    for (const item of this.selections) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private scrollToTop(): void {
    // Use setTimeout to scroll after the view has been updated with the sorted list.
    setTimeout(() => {
      if (this.stnIdNameTableContainer && this.stnIdNameTableContainer.nativeElement) {
        this.stnIdNameTableContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

  private emitSearchedStationIds() {
    const searchedIds: string[] = []; 
    for (const station of this.selections) {
      if (station.selected) searchedIds.push(station.station.id)
    }
    this.searchedIdsChange.emit(searchedIds);
  }


}
