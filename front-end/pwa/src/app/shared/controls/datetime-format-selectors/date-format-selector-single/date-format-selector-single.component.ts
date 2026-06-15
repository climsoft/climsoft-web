import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateFormat } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';

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
  @Input() public selectedId!: DateFormat | null;
  @Output() public selectedIdChange = new EventEmitter<DateFormat>();

  protected options: DateFormat[] = Object.values(DateFormat);
  protected selectedOption!: DateFormat | null;

  ngOnChanges(changes: SimpleChanges): void {
    // Only react to changes if selectedId actually changes and is not the first change
    if (changes['selectedId'] && this.selectedId) {
      const found = this.options.find(item => item === this.selectedId);
      if (found && found !== this.selectedOption) {
        this.selectedOption = found;
      }
    }
  }

  private readonly displayLabels: Record<DateFormat, string> = {
    [DateFormat.YMD_DASH]: '2024-01-15 (%Y-%m-%d — ISO)',
    [DateFormat.DMY_DASH]: '15-01-2024 (%d-%m-%Y)',
    [DateFormat.MDY_DASH]: '01-15-2024 (%m-%d-%Y — US)',
    [DateFormat.YMD_SLASH]: '2024/01/15 (%Y/%m/%d)',
    [DateFormat.DMY_SLASH]: '15/01/2024 (%d/%m/%Y)',
    [DateFormat.MDY_SLASH]: '01/15/2024 (%m/%d/%Y — US Excel)',
    [DateFormat.YMD_DOT]: '2024.01.15 (%Y.%m.%d)',
    [DateFormat.DMY_DOT]: '15.01.2024 (%d.%m.%Y — DE/RU)',
    [DateFormat.YMD_COMPACT]: '20240115 (%Y%m%d — ISO basic / WMO)',
    [DateFormat.D_MON_Y_DASH]: '15-Jan-2024 (%d-%b-%Y)',
    [DateFormat.D_MON_Y_SPACE]: '15 Jan 2024 (%d %b %Y — NCDC)',
    [DateFormat.Y_J_DASH]: '2024-015 (%Y-%j — year + day of year)',
    [DateFormat.YJ_COMPACT]: '2024015 (%Y%j — basic Julian)',
  };

  protected optionDisplayFunction = (option: DateFormat): string => {
    return this.displayLabels[option] ?? option;
  }

  protected onSelectedOptionChange(selectedOption: DateFormat | null) {
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }
  }
}
