import { Component, Input } from '@angular/core';
import { DateTimeDefinition } from 'src/app/metadata/source-templates/models/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-date-detail',
  templateUrl: './import-source-date-detail.component.html',
  styleUrls: ['./import-source-date-detail.component.scss']
})
export class ImportSourceDateDetailComponent {

  @Input()
  public datetimeDefinition!: DateTimeDefinition;

  protected onDatetimeSelection(dateStatus: string): void {


    this.datetimeDefinition.dateTimeColumnPostion = undefined;
    this.datetimeDefinition.dateTimeInMultipleColumn = undefined;

    if (dateStatus === 'Date Time in Single Column') {
      this.datetimeDefinition.dateTimeColumnPostion = 0;
    } else if (dateStatus === 'Date Time in Multiple Columns') {
      this.datetimeDefinition.dateTimeInMultipleColumn = {
        dateInSingleColumn: undefined,
        dateInMultipleColumn: undefined,
        hourDefinition: {}
      };
    }
  }



}
