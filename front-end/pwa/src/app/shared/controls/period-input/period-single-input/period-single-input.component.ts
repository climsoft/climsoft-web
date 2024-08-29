import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnInit } from '@angular/core';
import { Period, PeriodsUtil } from './Periods.util';

// TODO. Make this control to be editable
@Component({
  selector: 'app-period-single-input',
  templateUrl: './period-single-input.component.html',
  styleUrls: ['./period-single-input.component.scss']
})
export class PeriodSingleInputComponent implements OnChanges {
  @Input() public id: string = '';
  @Input() public label: string = '';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: Period[];
  protected selectedOption!: Period | null;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {

    //console.log('period selectedId', this.selectedId, 'existing: ', this.selectedOption, '  ', changes)

    //load options once
    if (!this.options) {
      this.options = PeriodsUtil.possiblePeriods;
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = PeriodsUtil.possiblePeriods.filter(data => this.includeOnlyIds.includes(data.id));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(period => period.id === this.selectedId);
      if (found && found !== this.selectedOption) {
        //console.log('setting found: ', found)
        this.selectedOption = found;
      }

    }

  }

  protected optionDisplayFunction(option: Period): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: Period | null) {
    //console.log('period selection',' this.selectedOption: ', this.selectedOption, ' selectedOption', selectedOption);
    if (selectedOption) {
      //this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      //this.selectedId = null;
      this.selectedIdChange.emit(null);
    }

  }
}
