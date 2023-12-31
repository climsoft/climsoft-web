import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { FlagModel } from 'src/app/core/models/Flag.model'; 
import { EntryFieldItem, FormEntryUtil } from '../../form-entry/form-entry.util';

@Component({
  selector: 'app-grid-layout',
  templateUrl: './grid-layout.component.html', 
  styleUrls: ['./grid-layout.component.scss']
})
export class GridLayoutComponent implements OnInit, OnChanges {
  @Input() elements!: ElementModel[];
  @Input() dataSelectors!: DataSelectorsValues;
  @Input() formMetadata!: EntryForm;
  @Input() dbObservations!: ObservationModel[];
  @Input() flags!: FlagModel[];
  @Output() valueChange = new EventEmitter<ObservationModel>();

  public rowFieldDefinitions!: [number, string][];
  public colFieldDefinitions!: [number, string][];
  public entryObservations!: ObservationModel[][];

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (this.dbObservations && this.elements && this.elements.length > 0 &&
      this.dataSelectors && this.formMetadata && this.flags && this.flags.length > 0) {

      this.setup(this.dataSelectors, this.elements, this.formMetadata, this.dbObservations);

    } else {
      this.entryObservations = [];
    }

  }

  private setup(dataSelectors: DataSelectorsValues, elements: ElementModel[], formMetadata: EntryForm, observations: ObservationModel[]): void {

    if (!(this.formMetadata.fields.length > 1 && this.formMetadata.fields[1])) {
      return;
    }

    //get entry field to use for control definitions

    const entryFieldForRow = this.formMetadata.fields[0];
    const entryFieldForColumn = this.formMetadata.fields[1];

    const rowFieldDefs: [number, string][] = FormEntryUtil.getEntryFieldDefs(
      entryFieldForRow, elements, dataSelectors.year, dataSelectors.month, formMetadata.hours
    );

    const colFieldDefs: [number, string][] = FormEntryUtil.getEntryFieldDefs(
      entryFieldForColumn, elements, dataSelectors.year, dataSelectors.month, formMetadata.hours
    );

    const rowFieldItems: EntryFieldItem = { fieldProperty: entryFieldForRow, fieldValues: rowFieldDefs.map(data => (data[0])) }
    const colFieldItems: EntryFieldItem = { fieldProperty: entryFieldForColumn, fieldValues: colFieldDefs.map(data => (data[0])) }
    const controlDefs: ObservationModel[][] = FormEntryUtil.getEntryObservationsForGridLayout(dataSelectors, [rowFieldItems, colFieldItems], observations);

    this.rowFieldDefinitions = rowFieldDefs;
    this.colFieldDefinitions = colFieldDefs;
    this.entryObservations = controlDefs;
  }

  public getEntryObservation(rowDef: [number, string], colDef: [number, string]): ObservationModel {
    const rowIndex: number = this.rowFieldDefinitions.findIndex(data => (data === rowDef));
    const colIndex: number = this.colFieldDefinitions.findIndex(data => (data === colDef));
    return this.entryObservations[rowIndex][colIndex];
  }

  public onValueChange(entryObservation: ObservationModel): void {
    if (entryObservation) {
      this.valueChange.emit(entryObservation);
    }
  }

}
