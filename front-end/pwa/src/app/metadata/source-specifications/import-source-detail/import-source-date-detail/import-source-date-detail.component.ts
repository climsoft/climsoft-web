import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DateTimeDefinition } from 'src/app/metadata/source-specifications/models/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-date-detail',
  templateUrl: './import-source-date-detail.component.html',
  styleUrls: ['./import-source-date-detail.component.scss']
})
export class ImportSourceDateDetailComponent implements OnChanges {
  @Input() public datetimeDefinition!: DateTimeDefinition;
  @Output() public datetimeDefinitionChange = new EventEmitter<DateTimeDefinition>();

  constructor() {

  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  protected onDatetimeSelection(selection: string): void {
    // Reset all definitions first
    this.datetimeDefinition.dateTimeInSingleColumn = undefined;
    this.datetimeDefinition.dateTimeInTwoColumns = undefined;
    this.datetimeDefinition.dateTimeInMultipleColumns = undefined;

    if (selection === 'Date Time in Single Column') {
      this.datetimeDefinition.dateTimeInSingleColumn = {
        columnPosition: 0,
        datetimeFormat: '%Y-%m-%d %H:%M:%S'
      };
    } else if (selection === 'Date Time in Two Columns') {
      this.datetimeDefinition.dateTimeInTwoColumns = {
        dateColumn: {
          columnPosition: 0,
          dateFormat: '%Y-%m-%d'
        },
        timeColumn: {
          columnPosition: 0,
          timeFormat: '%H:%M:%S'
        }
      };
    } else if (selection === 'Date Time in Multiple Columns') {
      this.datetimeDefinition.dateTimeInMultipleColumns = {
        yearColumnPosition: 0,
        monthColumnPosition: 0,
        dayColumnPosition: '0',
        hourDefinition: {
          timeColumn: {
            columnPosition: 0,
            timeFormat: '%H:%M:%S'
          }
        }
      };
    }

    this.datetimeDefinitionChange.emit(this.datetimeDefinition);
  }

  protected onHourDefinitionSelection(selection: string): void {
    if (!this.datetimeDefinition.dateTimeInMultipleColumns) return;

    // Reset hour definitions
    this.datetimeDefinition.dateTimeInMultipleColumns.hourDefinition.timeColumn = undefined;
    this.datetimeDefinition.dateTimeInMultipleColumns.hourDefinition.defaultHour = undefined;

    if (selection === 'Time in Column') {
      this.datetimeDefinition.dateTimeInMultipleColumns.hourDefinition.timeColumn = {
        columnPosition: 0,
        timeFormat: '%H:%M:%S'
      };
    } else if (selection === 'Default Hour') {
      this.datetimeDefinition.dateTimeInMultipleColumns.hourDefinition.defaultHour = 0;
    }
  }

}
