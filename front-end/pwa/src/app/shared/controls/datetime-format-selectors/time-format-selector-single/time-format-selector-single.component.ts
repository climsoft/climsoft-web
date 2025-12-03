import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { TimeFormatTypes } from 'src/app/metadata/source-templates/models/create-import-source-tabular.model';

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

  protected optionDisplayFunction(option: TimeFormatTypes): string {
    return option;
  }

  protected onSelectedOptionChange(selectedOption: TimeFormatTypes | null) {
    //console.log('period selection',' this.selectedOption: ', this.selectedOption, ' selectedOption', selectedOption);
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }

  }
}
