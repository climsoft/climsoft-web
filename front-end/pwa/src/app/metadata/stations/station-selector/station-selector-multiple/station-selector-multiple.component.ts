import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
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

  protected stations: StationCacheModel[] = [];
  protected selectedStations: StationCacheModel[] = [];
  private allMetadataLoaded: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(private cachedMetadataService: CachedMetadataService) {
    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.allMetadataLoaded = allMetadataLoaded;
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
    if (!this.allMetadataLoaded) return;
    
    this.stations = this.includeOnlyIds && this.includeOnlyIds.length > 0 ?
      this.cachedMetadataService.stationsMetadata.filter(item => this.includeOnlyIds.includes(item.id)) :
      this.cachedMetadataService.stationsMetadata;
  }

  private filterBasedOnSelectedIds(): void {
    if (!this.allMetadataLoaded) return;

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
    this.selectedIds.length = 0; // clear the array
    this.selectedIds.push(...selectedOptions.map(data => data.id));

    // emit the id changes
    this.selectedIdsChange.emit(this.selectedIds);
  }

  /**
   * Raised when advanced search input changes
   * @param newSelectedIds 
   */
  protected onAdvancedSearchInput(newSelectedIds: string[]): void {
    // Get the selected elements based on the new selected Ids
    const newSelectedStations: StationCacheModel[] = this.stations.filter(station => newSelectedIds.includes(station.id));

    //----------------------------------------------------------------
    // Sort selected stations to have the selectedIds as first items in the filtered options array
    //----------------------------------------------------------------
    // Create a map for quick lookups of the desired order.
    const orderMap = new Map(newSelectedIds.map((idValue, index) => [idValue, index]));
    newSelectedStations.sort((a, b) => {
      const aInSelected = orderMap.has(a.id);
      const bInSelected = orderMap.has(b.id);

      // If both are in selectedIds, sort by their order in selectedIds
      if (aInSelected && bInSelected) {
        return orderMap.get(a.id)! - orderMap.get(b.id)!;
      }
      if (aInSelected) return -1; // a comes first
      if (bInSelected) return 1;  // b comes first 
      return 0;
    });
    //----------------------------------------------------------------


    // Set the new selected elements and Ids
    this.selectedStations = newSelectedStations;
    //this.selectedIds = newSelectedIds;
    this.selectedIds.length = 0;
    this.selectedIds.push(...newSelectedIds);

    // Emit the changes
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
