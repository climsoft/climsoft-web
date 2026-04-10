import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { ObservationEntry } from '../../../models/observation-entry.model';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { ValueFlagInputComponent } from '../../../value-flag-input/value-flag-input.component';
import { QCStatusEnum } from '../../../models/qc-status.enum';

let nextStackedViewerInstanceId = 0;

/**
 * Maps each QC status to its Bootstrap badge class. Typed as
 * `Record<QCStatusEnum, string>` so adding a new status to the enum is a
 * compile error here until it gets a colour.
 */
const QC_STATUS_BADGE_CLASS: Record<QCStatusEnum, string> = {
  [QCStatusEnum.NONE]: 'bg-secondary',
  [QCStatusEnum.PASSED]: 'bg-success',
  [QCStatusEnum.FAILED]: 'bg-danger',
};

@Component({
  selector: 'app-stacked-data-viewer',
  templateUrl: './stacked-data-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackedDataViewerComponent implements OnChanges {
  @ViewChildren(ValueFlagInputComponent) vfComponents!: QueryList<ValueFlagInputComponent>;

  /** When false, the underlying `<app-value-flag-input>` is disabled. */
  @Input() public allowDataEdits: boolean = true;

  /** Used to compute the row number column. */
  @Input() public pageInputDefinition: PagingParameters = new PagingParameters();

  /**
   * The flat list of observations to render. Each item carries its own
   * editing state (`change`, `delete`) which is shared by reference with
   * the parent — edits made through this viewer mutate the parent's array.
   */
  @Input() public observationsEntries: ObservationEntry[] = [];

  /**
   * Bubbled up from the value-flag input inside each cell so the parent can
   * recount pending changes. The emitted reference is the same
   * `ObservationEntry` instance that lives in `observationsEntries`.
   */
  @Output() public entryChanged = new EventEmitter<ObservationEntry>();

  /**
   * Asks the parent to toggle this entry's `delete` flag. The parent owns
   * the mutation so this viewer stays a pure renderer of the entries it
   * receives.
   */
  @Output() public deleteRequested = new EventEmitter<ObservationEntry>();

  /** Per-instance prefix so cell ids stay unique if multiple viewers coexist on the same page. */
  protected readonly instanceId: number = ++nextStackedViewerInstanceId;

  /** Pre-computed `(page - 1) * pageSize`; the template adds `rowIndex + 1`. */
  protected startingRowNumber: number = 0;

  protected rowHasDuplicate: boolean[] = [];

  protected readonly qcBadgeClass = QC_STATUS_BADGE_CLASS;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observationsEntries']) {
      this.markDuplicateRows(this.observationsEntries);
    }
    if (changes['pageInputDefinition']) {
      this.startingRowNumber = (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
    }
  }

  /**
   * Re-marks duplicates after the parent mutates `observationsEntries` in
   * place (push, splice, or editing a row's primary-key fields without
   * reassigning the array). Not needed when the parent assigns a new array.
   */
  public refreshDuplicates(): void {
    this.markDuplicateRows(this.observationsEntries);
  }

  /**
   * Stable identity for `*ngFor trackBy`. Built from the observation's
   * composite primary key so DOM nodes survive page reloads and bulk PK
   * updates.
   */
  protected trackByEntry = (_index: number, entry: ObservationEntry): string => {
    const o = entry.observation;
    return `${o.stationId}|${o.elementId}|${o.level}|${o.interval}|${o.datetime}|${o.sourceId}`;
  };

  /**
   * Handles Enter key press on a value-flag input by focusing the next
   * editable, non-deleted value-flag input.
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
}
