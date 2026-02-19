import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { TimeFormatTypes } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';

@Component({
  selector: 'app-time-format-selector-single',
  templateUrl: './time-format-selector-single.component.html',
  styleUrls: ['./time-format-selector-single.component.scss']
})
export class TimeFormatSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public displayCancelOption!: boolean;
  @Input() public selectedId!: TimeFormatTypes | null;
  @Output() public selectedIdChange = new EventEmitter<TimeFormatTypes>();

  protected options!: TimeFormatTypes[];
  protected selectedOption!: TimeFormatTypes | null;

  constructor() {
    this.options = [
      '%H:%M:%S',
      '%H:%M',
      '%-H:%M',
      '%H',
      '%-H'
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

  private readonly displayLabels: Record<TimeFormatTypes, string> = {
    '%H:%M:%S': '14:30:00 (%H:%M:%S)',
    '%H:%M': '14:30 (%H:%M)',
    '%-H:%M': '9:30 (%-H:%M, no padding)',
    '%H': '14 (%H, zero-padded)',
    '%-H': '9 (%-H, no padding)',
  };

  protected optionDisplayFunction = (option: TimeFormatTypes): string => {
    return this.displayLabels[option] ?? option;
  }

  protected onSelectedOptionChange(selectedOption: TimeFormatTypes | null) {
    //console.log('period selection',' this.selectedOption: ', this.selectedOption, ' selectedOption', selectedOption);
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }

  }
}
