import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ObservationEntry } from '../models/observation-entry.model';
import { ValueFlagInputComponent } from '../value-flag-input/value-flag-input.component';

@Component({
  selector: 'app-unstacked-data-viewer',
  templateUrl: './unstacked-data-viewer.component.html',
  styleUrls: ['./unstacked-data-viewer.component.scss']
})
export class UnstackedDataViewerComponent implements OnChanges {
  @Input() public observationsEntries!: ObservationEntry[];

  @Output() public valueChange: EventEmitter<ObservationEntry> = new EventEmitter<ObservationEntry>;

  protected groupedEntries!: Map<string, ObservationEntry[]>;

  // array of element abbreviations
  protected elementColumns!: string[];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observationsEntries'] && this.observationsEntries) {
      this.loadData();
    }
  }

  private loadData(): void {
    // Key is observation identifier
    const newGroupedEntries = new Map<string, ObservationEntry[]>();
    const newElementColumns: string[] = [];

    for (const obs of this.observationsEntries) {
      const obsIdentifier = `${obs.observation.stationId}-${obs.observation.level}-${obs.observation.datetime}-${obs.observation.interval}-${obs.observation.sourceId}`;

      // If observation group already exist then just push the new observation into the group
      // If it does not exist create a new group
      const existingGroup = newGroupedEntries.get(obsIdentifier);
      if (existingGroup) {
        existingGroup.push(obs);
      } else {
        newGroupedEntries.set(obsIdentifier, [obs]);
      }

      // Add the element to the list of table element columns
      const elementCol: string = `${obs.observation.elementId} - ${obs.elementAbbrv}`;
      if (!newElementColumns.find(item => item === elementCol)) {
        newElementColumns.push(elementCol);
      }
    }

    this.groupedEntries = newGroupedEntries;
    this.elementColumns = newElementColumns;
  }

  protected getObservation(elementCol: string, observations: ObservationEntry[]) {
    return observations.find(item => `${item.observation.elementId} - ${item.elementAbbrv}` === elementCol);
  }

  protected onUserInput(observationEntry: ObservationEntry) {
    this.valueChange.emit(observationEntry);
  }

}