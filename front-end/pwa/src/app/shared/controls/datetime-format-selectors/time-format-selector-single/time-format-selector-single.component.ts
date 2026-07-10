import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { TimeFormat } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';

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
  @Input() public selectedId!: TimeFormat | null;
  @Output() public selectedIdChange = new EventEmitter<TimeFormat>();

  protected options: TimeFormat[] = Object.values(TimeFormat);
  protected selectedOption!: TimeFormat | null;

  ngOnChanges(changes: SimpleChanges): void {
    // Only react to changes if selectedId actually changes and is not the first change
    if (changes['selectedId'] && this.selectedId) {
      const found = this.options.find(item => item === this.selectedId);
      if (found && found !== this.selectedOption) {
        this.selectedOption = found;
      }
    }
  }

  private readonly displayLabels: Record<TimeFormat, string> = {
    [TimeFormat.HMS]: '14:30:00 (%H:%M:%S)',
    [TimeFormat.HM]: '14:30 (%H:%M)',
    [TimeFormat.HM_UNPADDED]: '9:30 (%-H:%M, no padding)',
    [TimeFormat.H]: '14 (%H, zero-padded hour)',
    [TimeFormat.H_UNPADDED]: '9 (%-H, unpadded hour)',
    [TimeFormat.HMS_FRAC]: '14:30:00.123456 (%H:%M:%S.%f)',
    [TimeFormat.HMS_COMPACT]: '143000 (%H%M%S)',
    [TimeFormat.HM_COMPACT]: '1430 (%H%M)',
    [TimeFormat.HMS_AMPM]: '02:30:00 PM (%I:%M:%S %p)',
    [TimeFormat.HM_AMPM]: '02:30 PM (%I:%M %p)',
  };

  protected optionDisplayFunction = (option: TimeFormat): string => {
    return this.displayLabels[option] ?? option;
  }

  protected onSelectedOptionChange(selectedOption: TimeFormat | null) {
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }
  }
}
