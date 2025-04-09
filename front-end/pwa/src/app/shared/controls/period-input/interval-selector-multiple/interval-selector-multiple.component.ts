import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs'; 
import { Interval, IntervalsUtil } from '../interval-single-input/Intervals.util';

@Component({
  selector: 'app-interval-selector-multiple',
  templateUrl: './interval-selector-multiple.component.html',
  styleUrls: ['./interval-selector-multiple.component.scss']
})
export class IntervalSelectorMultipleComponent implements OnChanges {
  @Input()
  public id!: string;
  @Input()
  public label!: string;
  @Input()
  public placeholder!: string;
  @Input()
  public errorMessage!: string;
  @Input()
  public includeOnlyIds!: number[];
  @Input()
  public selectedIds: number[] = [];
  @Output()
  public selectedIdsChange = new EventEmitter<number[]>();

  protected allIntervals: Interval[];
  protected intervals!: Interval[];
  protected selectedIntervals!: Interval[];
  private destroy$ = new Subject<void>();

  constructor() {
    this.allIntervals = IntervalsUtil.possibleIntervals;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['includeOnlyIds']) {
      this.setIntervalssToInclude();
    }

    if (changes['selectedIds']) {
      this.filterBasedOnSelectedIds();
    }
  }

  private setIntervalssToInclude(): void {
    this.intervals = this.includeOnlyIds && this.includeOnlyIds.length > 0 ? this.allIntervals.filter(item => this.includeOnlyIds.includes(item.id)) : this.allIntervals;
  }

  private filterBasedOnSelectedIds(): void {
    const selectedInterval: Interval[] = [];
    if (this.selectedIds.length > 0) {
      // Note. To reserve the order loop by selected ids array not the elements arrays
      for (const id of this.selectedIds) {
        const foundElement = this.intervals.find(item => item.id === id);
        if (foundElement) {
          selectedInterval.push(foundElement);
        }
      }
    }

    this.selectedIntervals = selectedInterval;
  }

  protected optionDisplayFunction(option: Interval): string {
    return `${option.id} - ${option.name}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: Interval[]) {
    this.selectedIds.length = 0;
    this.selectedIds.push(...selectedOptions.map(data => data.id));
    this.selectedIdsChange.emit(this.selectedIds);
  }

  /**
   * Called from advanced search dialog
   * @param searchedIds 
   */
  protected onAdvancedSearchInput(searchedIds: number[]): void {
    this.selectedIds.length = 0;
    const selectedInterval: Interval[] = []
    for (const element of this.intervals) {
      if (searchedIds.includes(element.id)) {
        this.selectedIds.push(element.id);
        selectedInterval.push(element);
      }
    }
    this.selectedIntervals = selectedInterval;
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
