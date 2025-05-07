import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core'; 
import { getLast200Years, YearModel } from '../year-utils';

@Component({
  selector: 'app-year-selector-multiple',
  templateUrl: './year-selector-multiple.component.html',
  styleUrls: ['./year-selector-multiple.component.scss']
})
export class YearSelectorMultipleComponent implements OnChanges {
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

  protected allYears: YearModel[];
  protected years: YearModel[];
  protected selectedYears!: YearModel[]; 

  constructor() {
    this.allYears = getLast200Years();
    this.years = this.allYears; 
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['includeOnlyIds'] && this.includeOnlyIds) {
      this.setIntervalsToInclude();
    }

    if (changes['selectedIds'] && this.selectedIds) {
      this.filterBasedOnSelectedIds();
    }
  }

  private setIntervalsToInclude(): void {
    this.years = this.includeOnlyIds && this.includeOnlyIds.length > 0 ? this.allYears.filter(item => this.includeOnlyIds.includes(item.id)) : this.allYears;
  }

  private filterBasedOnSelectedIds(): void {
    const selectedInterval: YearModel[] = [];
    if (this.selectedIds.length > 0) {
      // Note. To reserve the order loop by selected ids array not the elements arrays
      for (const id of this.selectedIds) {
        const foundElement = this.years.find(item => item.id === id);
        if (foundElement) {
          selectedInterval.push(foundElement);
        }
      }
    }

    this.selectedYears = selectedInterval;
  }

  protected optionDisplayFunction(option: YearModel): string {
    return `${option.name}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: YearModel[]) {
    this.selectedIds.length = 0;
    this.selectedIds.push(...selectedOptions.map(data => data.id));
    this.selectedIdsChange.emit(this.selectedIds);
  }


}
