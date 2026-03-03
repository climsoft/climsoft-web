import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StationColumnMappingModel } from '../../../models/metadata-import-preview.model';
import { DateTimeDefinition } from '../../../source-specifications/models/import-source-tabular-params.model';

@Component({
  selector: 'app-station-import-dates-detail',
  templateUrl: './station-import-dates-detail.component.html',
  styleUrls: ['./station-import-dates-detail.component.scss']
})
export class StationImportDatesDetailComponent {
  @Input()
  public mapping!: StationColumnMappingModel;

  @Output()
  public mappingChange = new EventEmitter<StationColumnMappingModel>();

  protected onDateEstablishedToggle(include: boolean): void {
    this.mapping.dateEstablishedDefinition = include ? this.getDefaultDateTimeDefinition() : undefined;
    this.mappingChange.emit(this.mapping);
  }

  protected onDateClosedToggle(include: boolean): void {
    this.mapping.dateClosedDefinition = include ? this.getDefaultDateTimeDefinition() : undefined;
    this.mappingChange.emit(this.mapping);
  }

  private getDefaultDateTimeDefinition(): DateTimeDefinition {
    return {
      dateTimeInSingleColumn: {
        columnPosition: 0,
        datetimeFormat: '%Y-%m-%d %H:%M:%S',
      },
    };
  }
}
