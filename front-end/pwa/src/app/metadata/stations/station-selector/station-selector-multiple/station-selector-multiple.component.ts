import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';

@Component({
  selector: 'app-station-selector-multiple',
  templateUrl: './station-selector-multiple.component.html',
  styleUrls: ['./station-selector-multiple.component.scss']
})
export class StationSelectorMultipleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: string[];
  @Input() public selectedIds: string[] = [];
  @Output() public selectedIdsChange = new EventEmitter<string[]>();

  protected allStations: StationCacheModel[] = [];
  protected stations: StationCacheModel[] = [];
  protected selectedStations: StationCacheModel[] = [];
  private destroy$ = new Subject<void>();

  constructor(private stationsCacheService: StationsCacheService) {
    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allStations = data;
      this.setStationsToInclude();
      this.filterBasedOnSelectedIds();
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['includeOnlyIds']) {
      this.setStationsToInclude();
    }

    if (changes['selectedIds']) {
      this.filterBasedOnSelectedIds();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setStationsToInclude(): void {
    this.stations = this.includeOnlyIds && this.includeOnlyIds.length > 0 ? this.allStations.filter(item => this.includeOnlyIds.includes(item.id)) : this.allStations;
  }

  private filterBasedOnSelectedIds(): void {
    this.selectedStations = this.selectedIds.length > 0 ? this.stations.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: StationCacheModel): string {
    return `${option.id} - ${option.name}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: StationCacheModel[]) {
    this.selectedIds.length = 0;
    this.selectedIds.push(...selectedOptions.map(data => data.id));
    this.selectedIdsChange.emit(this.selectedIds);
  }

  /**
   * Called from advanced search dialog
   * @param newSearchedIds 
   */
  protected onAdvancedSearchInput(newSearchedIds: string[]): void {
    this.selectedIds.length = 0;
    const newSelectedStations: StationCacheModel[] = [];
    for (const station of this.stations) {
      if (newSearchedIds.includes(station.id)) {
        this.selectedIds.push(station.id);
        newSelectedStations.push(station); 
      }
    }
    this.selectedStations = newSelectedStations;
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
