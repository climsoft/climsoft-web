import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';
import { SelectionOptionTypeEnum } from '../stations-search-dialog.component';
import { ViewStationObsEnvModel } from '../../models/view-station-obs-env.model';

interface SearchModel {
  environment: ViewStationObsEnvModel;
  selected: boolean;
}

@Component({
  selector: 'app-station-environments-search',
  templateUrl: './station-environments-search.component.html',
  styleUrls: ['./station-environments-search.component.scss']
})
export class StationEnvironmentsSearchComponent implements OnChanges {
  @ViewChild('stnEnvironmentTableContainer') stnEnvironmentTableContainer!: ElementRef;

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
    this.selections = (await this.stationsCacheService.getStationObsEnv()).map(environment => {
      return {
        environment: environment, selected: false
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.selections.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.environment.name.toLowerCase().includes(this.searchValue)) {
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
          this.selections.sort((a, b) => a.environment.name.localeCompare(b.environment.name));
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
      if (this.stnEnvironmentTableContainer && this.stnEnvironmentTableContainer.nativeElement) {
        this.stnEnvironmentTableContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

  private emitSearchedStationIds() {
    const searchedStationIds: string[] = [];
    const selectedEnvironments = this.selections.filter(item => item.selected);
    for (const selectedEnvironment of selectedEnvironments) {
      for (const station of this.stations) {
        if (station.stationObsEnvironmentId === selectedEnvironment.environment.id) {
          searchedStationIds.push(station.id);
        }
      }
    }
    this.searchedIdsChange.emit(searchedStationIds);
  }

}
