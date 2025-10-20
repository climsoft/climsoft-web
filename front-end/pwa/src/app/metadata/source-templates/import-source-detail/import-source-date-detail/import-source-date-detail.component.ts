import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DateTimeDefinition } from 'src/app/metadata/source-templates/models/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-date-detail',
  templateUrl: './import-source-date-detail.component.html',
  styleUrls: ['./import-source-date-detail.component.scss']
})
export class ImportSourceDateDetailComponent implements OnChanges {
  @Input()
  public datetimeDefinition!: DateTimeDefinition;

  private cachedDatetimeDefinition!: DateTimeDefinition;

  constructor() {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.datetimeDefinition) {
      this.cachedDatetimeDefinition = { ...this.datetimeDefinition };
    }

  }

  protected onDatetimeSelection(dateStatus: string): void {
    this.datetimeDefinition.dateTimeInSingleColumn = undefined;
    this.datetimeDefinition.dateTimeInMultipleColumn = undefined;

    if (dateStatus === 'Date Time in Single Column') {
      if (this.cachedDatetimeDefinition && this.cachedDatetimeDefinition.dateTimeInSingleColumn) {
        this.datetimeDefinition.dateTimeInSingleColumn = this.cachedDatetimeDefinition.dateTimeInSingleColumn;
      } else {
        this.datetimeDefinition.dateTimeInSingleColumn = {
          columnPosition: 1,
          datetimeFormat: '%Y-%m-%d %H:%M',
        };
      }
    } else if (dateStatus === 'Date Time in Multiple Columns') {
      if (this.cachedDatetimeDefinition && this.cachedDatetimeDefinition.dateTimeInMultipleColumn) {
        this.datetimeDefinition.dateTimeInMultipleColumn = this.cachedDatetimeDefinition.dateTimeInMultipleColumn;
      } else {
        this.datetimeDefinition.dateTimeInMultipleColumn = {
          dateInSingleColumn: {
            columnPosition: 1,
            dateFormat: '%Y-%m-%d',
          },
          timeInSingleColumn:{
            columnPosition: 1,
            timeFormat: '%H:%M:%S',
          },
          dateInMultipleColumn: undefined,
          hourDefinition: {},
        };
      }
    }
  }



}
