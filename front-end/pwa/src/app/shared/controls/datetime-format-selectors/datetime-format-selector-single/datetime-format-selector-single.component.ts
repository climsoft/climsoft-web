import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateTimeFormat } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';

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
  @Input() public selectedId!: DateTimeFormat | null;
  @Output() public selectedIdChange = new EventEmitter<DateTimeFormat>();

  protected options: DateTimeFormat[] = Object.values(DateTimeFormat);
  protected selectedOption!: DateTimeFormat | null;

  ngOnChanges(changes: SimpleChanges): void {
    // Only react to changes if selectedId actually changes and is not the first change
    if (changes['selectedId'] && this.selectedId) {
      const found = this.options.find(item => item === this.selectedId);
      if (found && found !== this.selectedOption) {
        this.selectedOption = found;
      }
    }
  }

  private readonly displayLabels: Record<DateTimeFormat, string> = {
    // ISO 8601 / RFC 3339
    [DateTimeFormat.ISO_YMD_T_HMS]: '2024-01-15T14:30:00 (%Y-%m-%dT%H:%M:%S)',
    [DateTimeFormat.ISO_YMD_T_HMS_Z]: '2024-01-15T14:30:00Z (%Y-%m-%dT%H:%M:%SZ)',
    [DateTimeFormat.ISO_YMD_T_HMS_FRAC]: '2024-01-15T14:30:00.123456 (%Y-%m-%dT%H:%M:%S.%f)',
    [DateTimeFormat.ISO_YMD_T_HM]: '2024-01-15T14:30 (%Y-%m-%dT%H:%M)',

    // YMD, space-separated
    [DateTimeFormat.YMD_DASH_HMS]: '2024-01-15 14:30:00 (%Y-%m-%d %H:%M:%S)',
    [DateTimeFormat.YMD_DASH_HM]: '2024-01-15 14:30 (%Y-%m-%d %H:%M)',
    [DateTimeFormat.YMD_DASH_HMS_FRAC]: '2024-01-15 14:30:00.123456 (%Y-%m-%d %H:%M:%S.%f)',
    [DateTimeFormat.YMD_SLASH_HMS]: '2024/01/15 14:30:00 (%Y/%m/%d %H:%M:%S)',
    [DateTimeFormat.YMD_SLASH_HM]: '2024/01/15 14:30 (%Y/%m/%d %H:%M)',

    // DMY, space-separated
    [DateTimeFormat.DMY_DASH_HMS]: '15-01-2024 14:30:00 (%d-%m-%Y %H:%M:%S)',
    [DateTimeFormat.DMY_DASH_HM]: '15-01-2024 14:30 (%d-%m-%Y %H:%M)',
    [DateTimeFormat.DMY_SLASH_HMS]: '15/01/2024 14:30:00 (%d/%m/%Y %H:%M:%S)',
    [DateTimeFormat.DMY_SLASH_HM]: '15/01/2024 14:30 (%d/%m/%Y %H:%M)',

    // MDY (US)
    [DateTimeFormat.MDY_DASH_HMS]: '01-15-2024 14:30:00 (%m-%d-%Y %H:%M:%S)',
    [DateTimeFormat.MDY_DASH_HM]: '01-15-2024 14:30 (%m-%d-%Y %H:%M — US)',
    [DateTimeFormat.MDY_SLASH_HMS]: '01/15/2024 14:30:00 (%m/%d/%Y %H:%M:%S)',
    [DateTimeFormat.MDY_SLASH_HM]: '01/15/2024 14:30 (%m/%d/%Y %H:%M)',

    // 12-hour AM/PM
    [DateTimeFormat.YMD_DASH_HM_AMPM]: '2024-01-15 02:30 AM/PM (%Y-%m-%d %I:%M %p)',
    [DateTimeFormat.YMD_DASH_HMS_AMPM]: '2024-01-15 02:30:00 AM/PM (%Y-%m-%d %I:%M:%S %p)',
    [DateTimeFormat.DMY_SLASH_HM_AMPM]: '15/01/2024 02:30 AM/PM (%d/%m/%Y %I:%M %p)',
    [DateTimeFormat.DMY_SLASH_HMS_AMPM]: '15/01/2024 02:30:00 AM/PM (%d/%m/%Y %I:%M:%S %p)',
    [DateTimeFormat.MDY_SLASH_HM_AMPM]: '01/15/2024 02:30 AM/PM (%m/%d/%Y %I:%M %p)',
    [DateTimeFormat.MDY_SLASH_HMS_AMPM]: '01/15/2024 02:30:00 AM/PM (%m/%d/%Y %I:%M:%S %p)',

    // Dot-separated (European)
    [DateTimeFormat.DMY_DOT_HMS]: '15.01.2024 14:30:00 (%d.%m.%Y %H:%M:%S)',
    [DateTimeFormat.DMY_DOT_HM]: '15.01.2024 14:30 (%d.%m.%Y %H:%M)',
    [DateTimeFormat.YMD_DOT_HMS]: '2024.01.15 14:30:00 (%Y.%m.%d %H:%M:%S)',

    // Abbreviated month name
    [DateTimeFormat.D_MON_Y_DASH_HMS]: '15-Jan-2024 14:30:00 (%d-%b-%Y %H:%M:%S)',
    [DateTimeFormat.D_MON_Y_SPACE_HM]: '15 Jan 2024 14:30 (%d %b %Y %H:%M)',

    // Compact basic (WMO / BUFR / synoptic)
    [DateTimeFormat.YMDHMS_COMPACT]: '20240115143000 (%Y%m%d%H%M%S)',
    [DateTimeFormat.YMDHM_COMPACT]: '202401151430 (%Y%m%d%H%M)',
  };

  protected optionDisplayFunction = (option: DateTimeFormat): string => {
    return this.displayLabels[option] ?? option;
  }

  protected onSelectedOptionChange(selectedOption: DateTimeFormat | null) {
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }
  }
}
