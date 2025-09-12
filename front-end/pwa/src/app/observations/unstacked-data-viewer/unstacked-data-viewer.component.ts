import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'; 
import { ObservationEntry } from '../models/observation-entry.model';

@Component({
  selector: 'app-unstacked-data-viewer',
  templateUrl: './unstacked-data-viewer.component.html',
  styleUrls: ['./unstacked-data-viewer.component.scss']
})
export class UnstackedDataViewerComponent implements OnChanges {
  @Input()
  public observationsEntries!: ObservationEntry[];
 
  @Output()
  public valueChange: EventEmitter<void> = new EventEmitter<void>;

  protected groupedEntries!: Map<string, ObservationEntry[]>;

  // array of element abbreviations
  protected elementColumns!: string[];

  constructor( ) {
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
      const obsIdentifier = `${obs.obsDef.observation.stationId}-${obs.obsDef.observation.level}-${obs.obsDef.observation.datetime}-${obs.obsDef.observation.interval}-${obs.obsDef.observation.sourceId}`;

      // If observation group already exist then just push the new observation into the group
      // If it does not exist create a new group
      if (newGroupedEntries.has(obsIdentifier)) {
        newGroupedEntries.get(obsIdentifier)?.push(obs);
      } else {
        newGroupedEntries.set(obsIdentifier, [obs]);
      }

      // Add the element to the list of table element columns
      const elementCol :string = `${obs.obsDef.observation.elementId} - ${obs.elementAbbrv}`;
      if (!newElementColumns.find(item => item === elementCol)) {
        newElementColumns.push(elementCol);
      }
    }

    this.groupedEntries = newGroupedEntries;
    this.elementColumns = newElementColumns;
  }

  protected getObservation(elementCol: string, observations: ObservationEntry[]) {
    return observations.find(item => `${item.obsDef.observation.elementId} - ${item.elementAbbrv}` === elementCol);
  }

  protected onUserInput() { 
    this.valueChange.emit();
  }


}