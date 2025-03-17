import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
 
@Component({
  selector: 'app-station-selector-multiple',
  templateUrl: './station-selector-multiple.component.html',
  styleUrls: ['./station-selector-multiple.component.scss']
})
export class StationSelectorMultipleComponent implements  OnChanges, OnDestroy {
  @Input()
  public id!: string;
  @Input()
  public label!: string;
  @Input()
  public placeholder!: string;
  @Input()
  public errorMessage!: string;
  @Input()
  public includeOnlyIds!: string[];
  @Input()
  public selectedIds!: string[];
  @Output()
  public selectedIdsChange = new EventEmitter<string[]>();

  protected allStations: StationCacheModel[] = [];
  protected stations!: StationCacheModel[];
  protected selectedStations!: StationCacheModel[];
  private destroy$ = new Subject<void>();

  constructor(private elementsCacheSevice: StationsCacheService) {
    this.elementsCacheSevice.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allStations = data;
      this.filterBasedOnSelectedIds();
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filterBasedOnSelectedIds();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private filterBasedOnSelectedIds(): void {
    this.stations = this.allStations;
    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.stations = this.allStations.filter(item => this.includeOnlyIds.includes(item.id));
    }
    this.selectedStations = this.selectedIds && this.selectedIds.length > 0 ? this.stations.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: StationCacheModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionsChange(selectedOptions: StationCacheModel[]) {
    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }

  protected onAdvancedSearchInput(selectedIds: string[]): void {
    this.selectedIds = selectedIds;
    this.filterBasedOnSelectedIds();
  }
}
