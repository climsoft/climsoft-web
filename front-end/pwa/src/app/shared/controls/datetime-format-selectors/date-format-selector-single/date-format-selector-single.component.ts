import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateFormatTypes } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';

@Component({
  selector: 'app-date-format-selector-single',
  templateUrl: './date-format-selector-single.component.html',
  styleUrls: ['./date-format-selector-single.component.scss']
})
export class DateFormatSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public displayCancelOption!: boolean;
  @Input() public selectedId!: DateFormatTypes | null;
  @Output() public selectedIdChange = new EventEmitter<DateFormatTypes>();

  protected options!: DateFormatTypes[];
  protected selectedOption!: DateFormatTypes | null;

  constructor() {
    this.options = [
      '%Y-%m-%d',
      '%d-%m-%Y',
      '%Y/%m/%d',
      '%d/%m/%Y',
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {

    // Only react to changes if selectedId actually changes and is not the first change
    if (changes['selectedId'] && this.selectedId) {
      const found = this.options.find(item => item === this.selectedId);
      if (found && found !== this.selectedOption) {
        this.selectedOption = found;
      }

    }

  }

  protected optionDisplayFunction(option: DateFormatTypes): string {
    return option;
  }

  protected onSelectedOptionChange(selectedOption: DateFormatTypes | null) {
    //console.log('period selection',' this.selectedOption: ', this.selectedOption, ' selectedOption', selectedOption);
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }

  }
}
