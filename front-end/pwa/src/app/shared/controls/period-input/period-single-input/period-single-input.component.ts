import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnInit } from '@angular/core';

interface Period {
  id: number;
  name: string;
}

@Component({
  selector: 'app-period-single-input',
  templateUrl: './period-single-input.component.html',
  styleUrls: ['./period-single-input.component.scss']
})
export class PeriodSingleInputComponent  implements OnInit, OnChanges  {
  @Input() public label: string = 'Period';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: Period[];
  protected selectedOption!: Period | null;

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //console.log('period selectedId', this.selectedId, 'existing: ', this.selectedOption, '  ', changes)

    //load options once
    if (!this.options) {
      this.options = this.getPeriods();
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = this.getPeriods().filter(data => this.includeOnlyIds.includes(data.id));
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

  private getPeriods(): Period[] {
    const periods: Period[] = [];
    periods.push({ id: 15, name: "15 minute" });
    periods.push({ id: 30, name: "30 minute" });
    periods.push({ id: 60, name: "1 hour" });
    periods.push({ id: 180, name: "3 hours" });
    periods.push({ id: 360, name: "6 hours" });
    periods.push({ id: 720, name: "12 hours" });
    periods.push({ id: 1440, name: "24 hours" });
    return periods;
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
