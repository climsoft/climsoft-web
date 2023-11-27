import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ControlDefinition } from '../value-flag-input/value-flag-input.component';
import { FormEntryService } from '../../form-entry/form-entry.service';



export interface TableControlDefinition extends ControlDefinition {
  rowId: number;
  colId: number;
}

export interface TableDefinition {
  id: number;
  name: string;
}

@Component({
  selector: 'app-table-layout',
  templateUrl: './table-layout.component.html',
  styleUrls: ['./table-layout.component.scss']
})
export class TableLayoutComponent implements OnInit, OnChanges {
  @Input() elements!: ElementModel[];
  @Input() dataSelectors!: DataSelectorsValues;
  @Input() formMetadata!: EntryForm;
  @Input() observations!: ObservationModel[];
  @Input() flags!: FlagModel[];
  @Output() valueChange = new EventEmitter<ObservationModel>();

  public controlsDefinitions: TableControlDefinition[] = [];
  private entryFieldForRow!: string;
  private entryFieldForColumn!: string;
  public rowTableDefinition!: TableDefinition[];
  public columnTableDefinition!: TableDefinition[];

  constructor(private formEntryService: FormEntryService) {

  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (this.observations && this.elements && this.elements.length > 0 &&
      this.dataSelectors &&
      this.formMetadata &&
      this.flags && this.flags.length > 0) {

      this.controlsDefinitions = this.createNewControlDefinitions();
    }

  }

  private createNewControlDefinitions(): TableControlDefinition[] {
    let controlsDefinitions: TableControlDefinition[] = [];

    // Get the row and column definitions from the entry fields
    this.entryFieldForRow = this.formMetadata.entryFields[0];
    this.entryFieldForColumn = this.formMetadata.entryFields[1];

    // Set row definition
    if (this.entryFieldForRow === "elementId") {
      this.rowTableDefinition = this.getTableDefinitionItems(this.elements, 'id', 'abbreviation');
    } else if (this.entryFieldForRow === "day") {
      this.rowTableDefinition = this.getTableDefinitionItems(DateUtils.getDaysInMonthList(this.dataSelectors.year, this.dataSelectors.month, ''), "id", "name");
    } else if (this.entryFieldForRow === "hour") {
      this.rowTableDefinition = this.getTableDefinitionItems(this.formMetadata.hours.length > 0 ? DateUtils.getHours(this.formMetadata.hours) : DateUtils.getHours(), "id", "name");
    } else {
      //Not supported
      //todo. display error in set up 
    }

    // Set column definition
    if (this.entryFieldForColumn === "elementId") {
      this.columnTableDefinition = this.getTableDefinitionItems(this.elements, 'id', 'abbreviation');
    } else if (this.entryFieldForColumn === "day") {
      this.columnTableDefinition = this.getTableDefinitionItems(DateUtils.getDaysInMonthList(this.dataSelectors.year, this.dataSelectors.month), "id", "name");
    } else if (this.entryFieldForColumn === "hour") {
      this.columnTableDefinition = this.getTableDefinitionItems(this.formMetadata.hours.length > 0 ? DateUtils.getHours(this.formMetadata.hours) : DateUtils.getHours(), "id", "name");
    } else {
      //Not supported
      //todo. display error in set up 
    }

    // Get control definitions from row and column definitions
    controlsDefinitions = this.getNewControlDefs(this.rowTableDefinition, this.columnTableDefinition);

    // Set control definitions entry data from the loaded data
    this.setControlDefinitionsEntryData(
      controlsDefinitions,
      this.observations,
      this.entryFieldForRow,
      this.entryFieldForColumn);

    return controlsDefinitions;
  }

  private getTableDefinitionItems(items: any[], valueProp: string, nameProp: string): TableDefinition[] {
    const tableDefinition: TableDefinition[] = [];
    for (const item of items) {
      tableDefinition.push({ id: item[valueProp], name: item[nameProp] });
    }
    return tableDefinition;
  }

  //gets an array of control definitions from the passed array
  private getNewControlDefs(
    rowEntryFieldItems: TableDefinition[],
    colEntryFieldItems: TableDefinition[]): TableControlDefinition[] {

    const controlDefs: TableControlDefinition[] = [];
    for (const row of rowEntryFieldItems) {

      for (const col of colEntryFieldItems) {
        controlDefs.push({
          rowId: row.id,
          colId: col.id,
          entryData: this.formEntryService.getNewEntryDataDelete(
            this.dataSelectors, this.formMetadata.entryFields, [row.id, col.id])
        });
      }

    }
    return controlDefs;
  }

  private setControlDefinitionsEntryData(
    controlsDefinitions: TableControlDefinition[],
    observations: ObservationModel[],
    entryFieldForRow: string,
    entryFieldForColumn: string): void {

    // Set control definitions entry data and displayed value flag 
    for (const controlDef of controlsDefinitions) {

      for (const observation of observations) {

        let rowObsFieldValue: number;
        let colObsFieldValue: number;

        switch (entryFieldForRow) {
          case "elementId":
            rowObsFieldValue = observation.elementId;
            break;
          case "day":
            rowObsFieldValue = DateUtils.getDayFromSQLDate(observation.datetime);
            break;
          case "hour":
            rowObsFieldValue = DateUtils.getHourFromSQLDate(observation.datetime);
            break;
          default:
            // Handle unsupported entryField or other cases
            // Todo. display set up error
            continue;
        }

        switch (entryFieldForColumn) {
          case "elementId":
            colObsFieldValue = observation.elementId;
            break;
          case "day":
            colObsFieldValue = DateUtils.getDayFromSQLDate(observation.datetime);
            break;
          case "hour":
            colObsFieldValue = DateUtils.getHourFromSQLDate(observation.datetime);
            break;
          default:
            // Handle unsupported entryField or other cases
            // Todo. display set up error
            continue;
        }


        // Check if observation values fit to be in the row and column identifiers
        if (!(controlDef.rowId === rowObsFieldValue && controlDef.colId === colObsFieldValue)) {
          continue;
        }

        controlDef.entryData = observation;
      }

    }
  }

  public getControlDefinition(
    rowEntryFieldItem: TableDefinition,
    colEntryFieldItem: TableDefinition
  ): TableControlDefinition {

    for (const controlDefinition of this.controlsDefinitions) {
      if (controlDefinition.rowId === rowEntryFieldItem.id && controlDefinition.colId === colEntryFieldItem.id) {
        return controlDefinition;
      }

    }

    return this.getNewControlDefs([rowEntryFieldItem], [colEntryFieldItem])[0];
  }


  //todo. do we really need the ControlDefinition or just the observation data? 
  public onValueChange(controlDefinition: ControlDefinition): void {
    if(controlDefinition.entryData){
      this.valueChange.emit(controlDefinition.entryData);
    }
  }

}
