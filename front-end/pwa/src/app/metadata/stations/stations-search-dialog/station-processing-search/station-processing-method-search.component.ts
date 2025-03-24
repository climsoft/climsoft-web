import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';
import { SelectionOptionTypeEnum } from '../stations-search-dialog.component';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StationObsProcessingMethodEnum } from '../../models/station-obs-processing-method.enum';

interface SearchModel {
  processingMethod: StationObsProcessingMethodEnum;
  selected: boolean;
  formattedStatus: string;
}

@Component({
  selector: 'app-station-processing-method-search',
  templateUrl: './station-processing-method-search.component.html',
  styleUrls: ['./station-processing-method-search.component.scss']
})
export class StationProcessingMethodSearchComponent implements OnChanges, OnDestroy {
  @Input() public searchValue!: string;
  @Input() public selectionOption!: SelectionOptionTypeEnum;
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected stationProcessingMethods: SearchModel[] = [];
  protected stations: StationCacheModel[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private stationsCacheService: StationsCacheService
  ) {

    this.stationProcessingMethods = Object.values(StationObsProcessingMethodEnum).map(item => {
      return {
        processingMethod: item,
        selected: false,
        formattedStatus: StringUtils.formatEnumForDisplay(item)
      };
    })

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.stations = data;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      this.onSearchInput(this.searchValue);
    }

    if (changes['selectionOption']) {
      this.onOptionSelected(this.selectionOption);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private onSearchInput(searchValue: string): void {
    // Make the searched items be the first items
    this.stationProcessingMethods.sort((a, b) => {
      // If search is found, move it before `b`, otherwise after
      if (a.formattedStatus.toLowerCase().includes(searchValue)) {
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
    for (const item of this.stationProcessingMethods) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.stationProcessingMethods.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private emitSearchedStationIds() {
    // TODO. a hack around due to event after view errors: Investigate later.
    setTimeout(() => {
      const searchedIds: string[] = []
      const selectedStationStatuses = this.stationProcessingMethods.filter(item => item.selected);
      for (const selectedStatus of selectedStationStatuses) {
        for (const station of this.stations) {
          if (station.stationObsProcessingMethod === selectedStatus.processingMethod) {
            searchedIds.push(station.id);
          }
        }
      }
      this.searchedIdsChange.emit(searchedIds);
    }, 0);
  }



}
