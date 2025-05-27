import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';
import { SelectionOptionTypeEnum } from '../stations-search-dialog.component';
import { ViewStationObsFocusModel } from '../../models/view-station-obs-focus.model';

interface SearchModel {
  focus: ViewStationObsFocusModel;
  selected: boolean;
}

@Component({
  selector: 'app-station-focuses-search',
  templateUrl: './station-focuses-search.component.html',
  styleUrls: ['./station-focuses-search.component.scss']
})
export class StationFocusesSearchComponent implements OnChanges {
  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: SelectionOptionTypeEnum;
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected focuses: SearchModel[] = [];

  constructor(
    private stationsCacheService: StationsCacheService
  ) {

    this.loadFocus();
  }

  private async loadFocus() {
    this.focuses = (await this.stationsCacheService.getStationObsFocus()).map(focus => {
      return {
        focus: focus, selected: false
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      this.onSearchInput(this.searchValue);
    }

    if (changes['selectionOption'] && this.selectionOption) {
      this.onOptionSelected(this.selectionOption);
    }
  }


  private onSearchInput(searchValue: string): void {
    // Make the searched items be the first items
    this.focuses.sort((a, b) => {
      // If search is found, move it before `b`, otherwise after
      if (a.focus.name.toLowerCase().includes(searchValue)) {
        return -1;
      }
      return 1;
    });

  }

  protected onSelected(selection: SearchModel): void {
    selection.selected = !selection.selected;
    this.emitSearchedStationIds();
  }

  private onOptionSelected(option: SelectionOptionTypeEnum): void {
    switch (option) {
      case SelectionOptionTypeEnum.SELECT_ALL:
        this.selectAll(true);
        break;
      case SelectionOptionTypeEnum.DESLECT_ALL:
        this.selectAll(false);
        break;
      case SelectionOptionTypeEnum.SORT_SELECTED:
        this.sortBySelected();
        break;
      default:
        break;
    }
  }

  private selectAll(select: boolean): void {
    for (const item of this.focuses) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.focuses.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private emitSearchedStationIds() {
    // TODO. a hack around due to event after view errors: Investigate later.
    //setTimeout(() => {
      const searchedStationIds: string[] = [];
      const selectedFocuses = this.focuses.filter(item => item.selected);
      for (const selectedFocus of selectedFocuses) {
        for (const station of this.stations) {
          if (station.stationObsFocusId === selectedFocus.focus.id) {
            searchedStationIds.push(station.id);
          }
        }
      }
      this.searchedIdsChange.emit(searchedStationIds);
    //}, 0);
  }

}
