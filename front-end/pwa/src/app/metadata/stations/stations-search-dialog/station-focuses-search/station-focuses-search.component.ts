import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
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
  @ViewChild('stnFocusesTableContainer') stnFocusesTableContainer!: ElementRef;

  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected selections: SearchModel[] = [];

  constructor(
    private stationsCacheService: StationsCacheService
  ) {

    this.loadFocus();
  }

  private async loadFocus() {
    this.selections = (await this.stationsCacheService.getStationObsFocus()).map(focus => {
      return {
        focus: focus, selected: false
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.selections.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.focus.name.toLowerCase().includes(this.searchValue)) {
          return -1;
        }
        return 1;
      });
      this.scrollToTop();
    }

    if (changes['selectionOption'] && this.selectionOption) {
      switch (this.selectionOption.value) {
        case SelectionOptionTypeEnum.SELECT_ALL:
          this.selectAll(true);
          break;
        case SelectionOptionTypeEnum.DESELECT_ALL:
          this.selectAll(false);
          break;
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
        case SelectionOptionTypeEnum.SORT_BY_NAME:
          this.selections.sort((a, b) => a.focus.name.localeCompare(b.focus.name));
          this.scrollToTop();
          break;
        default:
          break;
      }
    }
  }

  protected onSelected(selection: SearchModel): void {
    selection.selected = !selection.selected;
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
      if (this.stnFocusesTableContainer && this.stnFocusesTableContainer.nativeElement) {
        this.stnFocusesTableContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

  private emitSearchedStationIds() {
    // TODO. a hack around due to event after view errors: Investigate later.
    //setTimeout(() => {
    const searchedStationIds: string[] = [];
    const selectedFocuses = this.selections.filter(item => item.selected);
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
