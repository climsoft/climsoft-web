import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormEntryDefinition } from '../defintions/form-entry.definition';
import { FieldEntryDefinition } from '../defintions/field.definition';
import { ObservationDefinition } from '../defintions/observation.definition';

@Component({
  selector: 'app-grid-layout',
  templateUrl: './grid-layout.component.html',
  styleUrls: ['./grid-layout.component.scss']
})
export class GridLayoutComponent implements OnChanges {
  @Input()
  public formDefinitions!: FormEntryDefinition;

  @Input()
  public refreshLayout!: boolean;

  @Input()
  public displayExtraInfoOption!: boolean;

  @Input()
  public gridNavigation!: 'horizontal' | 'vertical';

  /** Emitted when observation value is changed */
  @Output()
  public userInputVF = new EventEmitter<ObservationDefinition>();

  /** Emitted when observation value or total value is changed */
  @Output()
  public totalIsValid = new EventEmitter<boolean>();

  /** Holds row entry fields needed for creating value flag components; elements, days, hours */
  protected rowFieldDefinitions!: FieldEntryDefinition[];

  /** Holds column entry fields needed for creating value flag components; elements, days, hours */
  protected colFieldDefinitions!: FieldEntryDefinition[];

  /** Holds all the observation definitions used  by created value flag components */
  protected observationsDefinitions!: ObservationDefinition[][];

  /** Holds the error message for total validation. Used by the total components of each column */
  protected totalErrorMessage!: string[];

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["refreshLayout"] && this.refreshLayout) {
      if (this.formDefinitions.formMetadata.fields.length < 0 || !this.formDefinitions.formMetadata.fields[1]) {
        return;
      }

      this.rowFieldDefinitions = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[0]);
      this.colFieldDefinitions = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[1]);
      this.observationsDefinitions = this.formDefinitions.obsDefsForGridLayout;
      // Important to statically fill with undefined values for working with 'some' and 'every' array functions
      this.totalErrorMessage = new Array(this.colFieldDefinitions.length).fill(undefined);   
    }
  }

  protected get rowHeaderName(): string {
    return this.formDefinitions.formMetadata.fields[0]
  }

  /**
   * Gets the observation definition of the specified row and column index.
   * @param rowIndex 
   * @param colIndex 
   * @returns 
   */
  protected getObservationDef(rowIndex: number, colIndex: number): ObservationDefinition {
    return this.observationsDefinitions[rowIndex][colIndex];
  }

  /**
  * Handles observation value changes
  * Clears any total error message  
  */
  protected onUserInputVF(observationDef: ObservationDefinition, colIndex: number): void {
    this.userInputVF.emit(observationDef);

    // Only emit total validity if the definition metadata requires it
    if (this.formDefinitions.formMetadata.requireTotalInput) {
      this.totalErrorMessage[colIndex] = '';
      this.totalIsValid.emit(false);
    }

  }

  /**
   * Handles total value changes by updating the internal state and emiting totalIsValid state
   * @param colIndex 
   * @param value 
   */
  protected onTotalValueChange(colIndex: number, value: number | null): void {
    // Get all observation in the column
    const colObservations: ObservationDefinition[] = [];
    for (let rowIndex = 0; rowIndex < this.rowFieldDefinitions.length; rowIndex++) {
      colObservations.push(this.observationsDefinitions[rowIndex][colIndex]);
    }

    // Get their total as the expected
    const expectedTotal = FormEntryDefinition.getTotalValuesOfObs(colObservations);

    // Clear previous error message of the column total
    this.totalErrorMessage[colIndex] = '';

    // If expected total is not equal to the input total then set error message
    if (expectedTotal !== value) {
      this.totalErrorMessage[colIndex] = expectedTotal !== null ? `Expected total is ${expectedTotal}` : `No total expected`;
    }

    this.totalIsValid.emit(this.totalErrorMessage.every(str => str === undefined || str === '' ));
  }



}
