import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ControlDefinition } from '../value-flag-input/value-flag-input.component';
import { FieldDefinition, FormEntryService } from '../../form-entry/form-entry.service';




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

  public controlsDefinitions!: ControlDefinition[][] ;
  public rowFieldDefinitions!: FieldDefinition[];
  public colFieldDefinitions!: FieldDefinition[] ;


  constructor(private formEntryService: FormEntryService) {

  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (this.observations && this.elements && this.elements.length > 0 &&
      this.dataSelectors && this.formMetadata && this.flags && this.flags.length > 0) {


      this.setUpNewControlDefinitions(this.dataSelectors, this.elements, this.formMetadata, this.observations);


    }

  }


  private setUpNewControlDefinitions(dataSelectors: DataSelectorsValues, elements: ElementModel[], formMetadata: EntryForm, observations: ObservationModel[]): void {

    //get entry field to use for control definitions

    const entryFieldForRow = this.formMetadata.entryFields[0];
    const entryFieldForColumn = this.formMetadata.entryFields[1];

    const rowFieldDefinitions: FieldDefinition[] = this.formEntryService.getFieldDefinitions(
      entryFieldForRow, elements, dataSelectors.year, dataSelectors.month, formMetadata.hours
    );

    const colFieldDefinitions: FieldDefinition[] = this.formEntryService.getFieldDefinitions(
      entryFieldForColumn, elements, dataSelectors.year, dataSelectors.month, formMetadata.hours
    );

    //set control definitions 
    const rowObsFieldItems = { obsFieldProperty: entryFieldForRow, obsFieldValues: rowFieldDefinitions.map(data => (data.id)) }
    const colObsFieldItems = { obsFieldProperty: entryFieldForColumn, obsFieldValues: colFieldDefinitions.map(data => (data.id)) }

    const controlDefinitions: ControlDefinition[][] = this.formEntryService.getNewControlDefs2(
      dataSelectors, [rowObsFieldItems, colObsFieldItems]);

    //set existing observations to the control definitions
    this.formEntryService.setExistingObsToControlDefs(controlDefinitions.flatMap(data => (data)), observations);


    this.rowFieldDefinitions = rowFieldDefinitions;
    this.colFieldDefinitions = colFieldDefinitions;
    this.controlsDefinitions= controlDefinitions;
  }


  public getControlDefinition(row: FieldDefinition, col: FieldDefinition): ControlDefinition{
    const rowIndex: number = this.rowFieldDefinitions.findIndex(data => (data === row));
    const colIndex: number = this.colFieldDefinitions.findIndex(data => (data === col));
    return this.controlsDefinitions[rowIndex][colIndex];
  }

  //todo. do we really need the ControlDefinition or just the observation data? 
  public onValueChange(controlDefinition: ControlDefinition): void {
    if (controlDefinition.entryData) {
      this.valueChange.emit(controlDefinition.entryData);
    }
  }

}
