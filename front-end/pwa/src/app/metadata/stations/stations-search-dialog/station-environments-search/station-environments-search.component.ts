import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';
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
  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected environments: SearchModel[] = [];

  constructor(
    private stationsCacheService: StationsCacheService
  ) {
    this.loadFocus();
  }

  private async loadFocus() {
    this.environments = (await this.stationsCacheService.getStationObsEnv()).map(environment => {
      return {
        environment: environment, selected: false
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.environments.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.environment.name.toLowerCase().includes(this.searchValue)) {
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
          this.sortBySelected();
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
    for (const item of this.environments) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.environments.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private emitSearchedStationIds() {
    // TODO. a hack around due to event after view errors: Investigate later.
    // setTimeout(() => {
    const searchedStationIds: string[] = [];
    const selectedEnvironments = this.environments.filter(item => item.selected);
    for (const selectedEnvironment of selectedEnvironments) {
      for (const station of this.stations) {
        if (station.stationObsEnvironmentId === selectedEnvironment.environment.id) {
          searchedStationIds.push(station.id);
        }
      }
    }
    this.searchedIdsChange.emit(searchedStationIds);
    //}, 0);
  }

}
