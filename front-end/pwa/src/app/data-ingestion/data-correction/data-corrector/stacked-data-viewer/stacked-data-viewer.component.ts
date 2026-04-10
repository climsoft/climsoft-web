import { Component, EventEmitter, Input, OnChanges, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { ObservationEntry } from '../../../models/observation-entry.model';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { ValueFlagInputComponent } from '../../../value-flag-input/value-flag-input.component';

@Component({
  selector: 'app-stacked-data-viewer',
  templateUrl: './stacked-data-viewer.component.html',
  styleUrls: ['./stacked-data-viewer.component.scss']
})
export class StackedDataViewerComponent implements OnChanges {
  @ViewChildren(ValueFlagInputComponent) vfComponents!: QueryList<ValueFlagInputComponent>;

  @Input() public allowDataEdits: boolean = true;
  @Input() public pageInputDefinition!: PagingParameters;
  @Input() public observationsEntries: ObservationEntry[] = [];

  @Output() public valueChange: EventEmitter<ObservationEntry> = new EventEmitter<ObservationEntry>;

  protected rowHasDuplicate: boolean[] = [];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observationsEntries'] && this.pageInputDefinition && this.observationsEntries) {
      this.markDuplicateRows(this.observationsEntries);
    }
  }

  protected onUserInput(observationEntry: ObservationEntry) {
    this.valueChange.emit(observationEntry);
  }

  protected onUserDeleteClick(observationEntry: ObservationEntry) {
    observationEntry.delete = !observationEntry.delete;
    this.onUserInput(observationEntry);
  }

  /**
   * Handles Enter key press on a value-flag input by focusing the next editable and non-deleted value-flag input. 
   */
  protected onVFEnterKeyPressed(currentIndex: number): void {
    const items = this.vfComponents.toArray();
    for (let i = currentIndex + 1; i < items.length; i++) {
      const entry = this.observationsEntries[i];
      if (!entry.delete && !items[i].disableValueFlagEntry) {
        items[i].focus();
        return;
      }
    }
    // If ever needed, this can be extended to emit `focusSaveButton`so that the parent can focus the save button.
  }

  private markDuplicateRows(entries: ObservationEntry[]): void {
    this.rowHasDuplicate = new Array(entries.length).fill(false);
    const firstSeenAt = new Map<string, number>();

    for (let i = 0; i < entries.length; i++) {
      const obs = entries[i].observation;
      const key = `${obs.stationId}|${obs.elementId}|${obs.level}|${obs.interval}|${obs.datetime}`;

      if (firstSeenAt.has(key)) {
        this.rowHasDuplicate[firstSeenAt.get(key)!] = true;
        this.rowHasDuplicate[i] = true;
      } else {
        firstSeenAt.set(key, i);
      }
    }
  }

  protected getRowNumber(currentRowIndex: number): number {
    return NumberUtils.getRowNumber(this.pageInputDefinition.page, this.pageInputDefinition.pageSize, currentRowIndex);
  }

}