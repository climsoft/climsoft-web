import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DateFormat, DateTimeDefinition, DateTimeFormat, TimeFormat } from 'src/app/metadata/source-specifications/models/import-source-tabular-params.model';

@Component({
  selector: 'app-import-source-date-detail',
  templateUrl: './import-source-date-detail.component.html',
  styleUrls: ['./import-source-date-detail.component.scss']
})
export class ImportSourceDateDetailComponent {
  @Input() public datetimeDefinition!: DateTimeDefinition;
  @Output() public datetimeDefinitionChange = new EventEmitter<DateTimeDefinition>();

  constructor() {
  }

  protected onDatetimeSelection(selection: string): void {
    // Reset all definitions first
    this.datetimeDefinition.dateTimeInSingleColumn = undefined;
    this.datetimeDefinition.dateInSingleColumn = undefined;
    this.datetimeDefinition.dateTimeInTwoColumns = undefined;
    this.datetimeDefinition.dateTimeInMultipleColumns = undefined;
    this.datetimeDefinition.dateInMultipleColumns = undefined;

    if (selection === 'Date and Time in Single Column') {
      this.datetimeDefinition.dateTimeInSingleColumn = {
        columnPosition: 0,
        datetimeFormat: DateTimeFormat.YMD_DASH_HMS
      };
    } else if (selection === 'Date in Single Column') {
      this.datetimeDefinition.dateInSingleColumn = {
        columnPosition: 0,
        dateFormat: DateFormat.YMD_DASH,
        defaultHour: 0
      };
    } else if (selection === 'Date and Time in Two Columns') {
      this.datetimeDefinition.dateTimeInTwoColumns = {
        dateColumnPosition: 0,
        dateFormat: DateFormat.YMD_DASH,
        timeColumnPosition: 0,
        timeFormat: TimeFormat.HMS
      };
    } else if (selection === 'Date and Time in Multiple Columns') {
      this.datetimeDefinition.dateTimeInMultipleColumns = {
        yearColumnPosition: 0,
        monthColumnPosition: 0,
        dayColumnPosition: '0',
        timeColumnPosition: 0,
        timeFormat: TimeFormat.HMS
      };
    } else if (selection === 'Date in Multiple Columns') {
      this.datetimeDefinition.dateInMultipleColumns = {
        yearColumnPosition: 0,
        monthColumnPosition: 0,
        dayColumnPosition: '0',
        defaultHour: 0
      };
    }

    this.datetimeDefinitionChange.emit(this.datetimeDefinition);
  }

}
