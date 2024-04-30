import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormEntryUtil } from '../defintions/form-entry.util';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { FormEntryDefinition } from '../defintions/form-entry.definition';
import { FieldEntryDefinition } from '../defintions/field.definition';
import { ObservationDefinition } from '../defintions/observation.definition';

@Component({
  selector: 'app-grid-layout',
  templateUrl: './grid-layout.component.html',
  styleUrls: ['./grid-layout.component.scss']
})
export class GridLayoutComponent implements OnInit, OnChanges {
  @Input() public formDefinitions!: FormEntryDefinition;
  @Input() public clearValues!: boolean;

  @Output() public valueChange = new EventEmitter<ObservationDefinition>();
  @Output() public totalIsValid = new EventEmitter<boolean>();

  protected rowFieldDefinitions!: FieldEntryDefinition[];
  protected colFieldDefinitions!: FieldEntryDefinition[];
  protected observationsDefinitions!: ObservationDefinition[][];
  protected totalErrorMessage!: string[];


  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (this.formDefinitions) {
      if (this.formDefinitions.formMetadata.fields.length < 0 || !this.formDefinitions.formMetadata.fields[1]) {
        return;
      }
      this.rowFieldDefinitions = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[0]);
      this.colFieldDefinitions = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[1]);
      this.observationsDefinitions = this.formDefinitions.getEntryObsForGridLayout();
      this.totalErrorMessage = new Array<string>(this.colFieldDefinitions.length);
    } else {
      this.observationsDefinitions = [];
    }

    if (this.clearValues) {
      console.log('clear operations called');

      this.clearValues = false;
    }

  }

  protected get rowHeaderName(): string {
    return this.formDefinitions.formMetadata.fields[0]
  }

  protected getObservationDef(rowIndex: number, colIndex: number): ObservationDefinition {
    return this.observationsDefinitions[rowIndex][colIndex];
  }

  protected onValueChange(observationDef: ObservationDefinition, colIndex: number): void {

    this.valueChange.emit(observationDef);

    // Only emit total validity if the definition metadata requires it
    if (this.formDefinitions.formMetadata.validateTotal) {
      this.totalErrorMessage[colIndex] = '';
      this.totalIsValid.emit(false);
    }

  }


  protected onTotalValueChange(colIndex: number, value: number | null): void {
    const expectedTotal = this.getColumnTotal(colIndex);
    this.totalErrorMessage[colIndex] = '';

    if (expectedTotal !== value) {
      this.totalErrorMessage[colIndex] = expectedTotal !== null ? `Expected total is ${expectedTotal}` : `No total expected`;
    }

    // Check if there are any error messages 
    this.totalIsValid.emit(!this.totalErrorMessage.some(item => (item !== undefined && item !== '')));
    console.log("Total is valid: " , !this.totalErrorMessage.some(item => (item !== undefined && item !== '')))
  }


  private getColumnTotal(colIndex: number): number | null {
    const colObservations: ObservationDefinition[] = [];
    for (let rowIndex = 0; rowIndex < this.rowFieldDefinitions.length; rowIndex++) {
      colObservations.push(this.observationsDefinitions[rowIndex][colIndex]);
    }
    return FormEntryUtil.getTotalValuesOfObs(colObservations);
  }


}
