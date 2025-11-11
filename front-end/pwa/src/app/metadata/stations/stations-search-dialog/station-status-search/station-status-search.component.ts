import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel } from '../../services/stations-cache.service';
import { Subject } from 'rxjs';
import { SelectionOptionTypeEnum } from '../stations-search-dialog.component';
import { StationStatusEnum } from '../../models/station-status.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

interface SearchModel {
  status: StationStatusEnum;
  selected: boolean;
  formattedStatus: string;
}

@Component({
  selector: 'app-station-status-search',
  templateUrl: './station-status-search.component.html',
  styleUrls: ['./station-status-search.component.scss']
})
export class StationStatusSearchComponent implements OnChanges {
  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected selections: SearchModel[] = [];

  constructor() {
    this.selections = Object.values(StationStatusEnum).map(item => {
      return {
        status: item,
        selected: false,
        formattedStatus: StringUtils.formatEnumForDisplay(item)
      };
    })


  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.selections.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.formattedStatus.toLowerCase().includes(this.searchValue)) {
          return -1;
        }
        return 1;
      });
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
          break;
        case SelectionOptionTypeEnum.SORT_BY_NAME:
          this.selections.sort((a, b) => a.formattedStatus.localeCompare(b.formattedStatus));
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



  private emitSearchedStationIds() {
    // TODO. a hack around due to event after view errors: Investigate later.
    //setTimeout(() => {
    const searchedIds: string[] = []
    const selectedStationStatuses = this.selections.filter(item => item.selected);
    for (const selectedStatus of selectedStationStatuses) {
      for (const station of this.stations) {
        if (station.status === selectedStatus.status) {
          searchedIds.push(station.id);
        }
      }
    }
    this.searchedIdsChange.emit(searchedIds);
    //}, 0);
  }



}
