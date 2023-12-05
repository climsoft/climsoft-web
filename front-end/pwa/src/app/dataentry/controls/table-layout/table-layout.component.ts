import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ControlDefinition } from '../value-flag-input/value-flag-input.component';
import { EntryFieldItem, FormEntryService } from '../../form-entry/form-entry.service';


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

  public rowFieldDefinitions!: [number, string][];
  public colFieldDefinitions!: [number, string][];
  public controlsDefinitions!: ControlDefinition[][];

  constructor(private formEntryService: FormEntryService) {

  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (this.observations && this.elements && this.elements.length > 0 &&
      this.dataSelectors && this.formMetadata && this.flags && this.flags.length > 0) {

      this.setUpNewControlDefinitions(this.dataSelectors, this.elements, this.formMetadata, this.observations);

    } else {
      this.controlsDefinitions = [];
    }

  }


  private setUpNewControlDefinitions(dataSelectors: DataSelectorsValues, elements: ElementModel[], formMetadata: EntryForm, observations: ObservationModel[]): void {

    if (!(this.formMetadata.fields.length > 1 && this.formMetadata.fields[1])) {
      return;
    }

    //get entry field to use for control definitions

    const entryFieldForRow = this.formMetadata.fields[0];
    const entryFieldForColumn = this.formMetadata.fields[1];

    const rowFieldDefs: [number, string][] = this.formEntryService.getEntryFieldDefs(
      entryFieldForRow, elements, dataSelectors.year, dataSelectors.month, formMetadata.hours
    );

    const colFieldDefs: [number, string][] = this.formEntryService.getEntryFieldDefs(
      entryFieldForColumn, elements, dataSelectors.year, dataSelectors.month, formMetadata.hours
    );

    const rowFieldItems: EntryFieldItem = { fieldProperty: entryFieldForRow, fieldValues: rowFieldDefs.map(data => (data[0])) }
    const colFieldItems: EntryFieldItem = { fieldProperty: entryFieldForColumn, fieldValues: colFieldDefs.map(data => (data[0])) }
    const controlDefs: ControlDefinition[][] = this.formEntryService.getControlDefsGrid(dataSelectors, [rowFieldItems, colFieldItems], observations);

    this.rowFieldDefinitions = rowFieldDefs;
    this.colFieldDefinitions = colFieldDefs;
    this.controlsDefinitions = controlDefs;
  }

  public getControlDef(rowDef: [number, string], colDef: [number, string]): ControlDefinition {
    const rowIndex: number = this.rowFieldDefinitions.findIndex(data => (data === rowDef));
    const colIndex: number = this.colFieldDefinitions.findIndex(data => (data === colDef));
    return this.controlsDefinitions[rowIndex][colIndex];
  }


  //todo. do we really need the ControlDefinition or just the observation data? 
  public onValueChange(controlDefinition: ControlDefinition): void {
    if (controlDefinition.entryData) {
      this.valueChange.emit(controlDefinition.entryData);
    }
  }

}
