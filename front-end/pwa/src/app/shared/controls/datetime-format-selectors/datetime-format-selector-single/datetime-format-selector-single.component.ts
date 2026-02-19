import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateTimeFormatTypes } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';

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

  private readonly displayLabels: Record<DateTimeFormatTypes, string> = {
    '%Y-%m-%d %H:%M:%S': '2024-01-15 14:30:00 (%Y-%m-%d %H:%M:%S)',
    '%Y-%m-%d %H:%M': '2024-01-15 14:30 (%Y-%m-%d %H:%M)',
    '%Y-%m-%d': '2024-01-15 (%Y-%m-%d)',
    '%d-%m-%Y %H:%M:%S': '15-01-2024 14:30:00 (%d-%m-%Y %H:%M:%S)',
    '%d-%m-%Y %H:%M': '15-01-2024 14:30 (%d-%m-%Y %H:%M)',
    '%d-%m-%Y': '15-01-2024 (%d-%m-%Y)',
    '%Y/%m/%d %H:%M:%S': '2024/01/15 14:30:00 (%Y/%m/%d %H:%M:%S)',
    '%Y/%m/%d %H:%M': '2024/01/15 14:30 (%Y/%m/%d %H:%M)',
    '%Y/%m/%d': '2024/01/15 (%Y/%m/%d)',
    '%d/%m/%Y %H:%M:%S': '15/01/2024 14:30:00 (%d/%m/%Y %H:%M:%S)',
    '%d/%m/%Y %H:%M': '15/01/2024 14:30 (%d/%m/%Y %H:%M)',
    '%d/%m/%Y': '15/01/2024 (%d/%m/%Y)',
  };

  protected optionDisplayFunction = (option: DateTimeFormatTypes): string => {
    return this.displayLabels[option] ?? option;
  }

  protected onSelectedOptionChange(selectedOption: DateTimeFormatTypes | null) {
    //console.log('period selection',' this.selectedOption: ', this.selectedOption, ' selectedOption', selectedOption);
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }

  }
}
