import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateTimeFormatTypes } from 'src/app/metadata/source-templates/models/create-import-source-tabular.model';

@Component({
  selector: 'app-datetime-format-selector-single',
  templateUrl: './datetime-format-selector-single.component.html',
  styleUrls: ['./datetime-format-selector-single.component.scss']
})
export class DatetimeFormatSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public displayCancelOption!: boolean; 
  @Input() public selectedId!: DateTimeFormatTypes | null;
  @Output() public selectedIdChange = new EventEmitter<DateTimeFormatTypes>();

  protected options!: DateTimeFormatTypes[];
  protected selectedOption!: DateTimeFormatTypes | null;

  constructor() {
    this.options = [
      '%Y-%m-%d %H:%M:%S',
      '%Y-%m-%d %H:%M',
      '%Y-%m-%d',
      '%d-%m-%Y %H:%M:%S',
      '%d-%m-%Y %H:%M',
      '%d-%m-%Y',
      '%Y/%m/%d %H:%M:%S',
      '%Y/%m/%d %H:%M',
      '%Y/%m/%d',
      '%d/%m/%Y %H:%M:%S',
      '%d/%m/%Y %H:%M',
      '%d/%m/%Y'
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

  protected optionDisplayFunction(option: DateTimeFormatTypes): string {
    return option;
  }

  protected onSelectedOptionChange(selectedOption: DateTimeFormatTypes | null) {
    //console.log('period selection',' this.selectedOption: ', this.selectedOption, ' selectedOption', selectedOption);
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }

  }
}
