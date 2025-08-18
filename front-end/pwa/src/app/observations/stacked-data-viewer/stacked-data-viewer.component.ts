import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ObservationEntry } from '../models/observation-entry.model';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';

@Component({
  selector: 'app-stacked-data-viewer',
  templateUrl: './stacked-data-viewer.component.html',
  styleUrls: ['./stacked-data-viewer.component.scss']
})
export class StackedDataViewerComponent implements OnChanges {
  @Input()
  public pageInputDefinition!: PagingParameters;

  @Input()
  public observationsEntries!: ObservationEntry[];

  @Output()
  public valueChange: EventEmitter<void> = new EventEmitter<void>;
 
  protected allBoundariesIndices: number[] = [];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.pageInputDefinition && this.observationsEntries) {
      this.loadData();
    }
  }

  private loadData(): void {
    this.setRowBoundaryLineSettings(this.observationsEntries);
  }

  protected getObservation(elementCol: string, observations: ObservationEntry[]) {
    return observations.find(item => `${item.obsDef.observation.elementId} - ${item.elementAbbrv}` === elementCol);
  }

  protected onUserInput() {
    this.valueChange.emit();
  }

  protected setRowBoundaryLineSettings(observationsEntries: ObservationEntry[]): void {
     this.allBoundariesIndices = [];
    const obsIdentifierMap = new Map<string, number>();

    for (let i = 0; i < observationsEntries.length; i++) {
      const obs = observationsEntries[i].obsDef.observation;
      const obsIdentifier = `${obs.stationId}-${obs.elementId}-${obs.level}-${obs.interval}-${obs.datetime}`;
      // Update the map with the latest index for each unique identifier
      obsIdentifierMap.set(obsIdentifier, i);
    }

    // set all last occurrence indices as boundaries
    this.allBoundariesIndices = Array.from(obsIdentifierMap.values());
    // If length indices array is the same as entries, then no need to show boundaries
    if (observationsEntries.length === this.allBoundariesIndices.length) {
      this.allBoundariesIndices = [];
    }
  }

  protected includeLowerBoundaryLine(index: number): boolean {
    return this.allBoundariesIndices.includes(index);
  }

  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }

}