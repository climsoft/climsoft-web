import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-station-selector-single',
  templateUrl: './station-selector-single.component.html',
  styleUrls: ['./station-selector-single.component.scss']
})
export class StationSelectorSingleComponent implements OnChanges, OnDestroy {
  @Input()
  public id!: string;
  @Input()
  public label!: string;
  @Input()
  public errorMessage: string = '';
  @Input()
  public includeOnlyIds!: string[];
  @Input()
  public selectedId!: string | null;
  @Output()
  public selectedIdChange = new EventEmitter<string>();

  protected allStations: StationCacheModel[] = [];
  protected stations!: StationCacheModel[];
  protected selectedStation!: StationCacheModel | null;
  private destroy$ = new Subject<void>();

  constructor(private elementsCacheSevice: StationsCacheService) {
    this.elementsCacheSevice.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allStations = data;
      this.setStationsToInclude();
      this.setSelected();
    });
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['includeOnlyIds']) {
      this.setStationsToInclude();
    }
    if (changes['selectedId']) {
      this.setSelected();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private setStationsToInclude(): void {
    this.stations = this.includeOnlyIds && this.includeOnlyIds.length > 0 ? this.allStations.filter(item => this.includeOnlyIds.includes(item.id)) : this.allStations;
  }

  private setSelected(): void {
    if (this.selectedId) {
      const found = this.stations.find(data => data.id === this.selectedId);
      this.selectedStation = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: StationCacheModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: StationCacheModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : '';
    this.selectedIdChange.emit(this.selectedId);
  }
  
}
