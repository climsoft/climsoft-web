import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { FormEntryDefinition } from '../defintitions/form-entry.definition';
import { FieldEntryDefinition } from '../defintitions/field.definition';
import { ObservationDefinition } from '../defintitions/observation.definition';
import { UserFormSettingStruct } from '../user-form-settings/user-form-settings.component';
import { ValueFlagInputComponent } from '../value-flag-input/value-flag-input.component';
import { NumberInputComponent } from 'src/app/shared/controls/number-input/number-input.component';

@Component({
  selector: 'app-grid-layout',
  templateUrl: './grid-layout.component.html',
  styleUrls: ['./grid-layout.component.scss']
})
export class GridLayoutComponent implements OnChanges {
  // Collect all input elements in the table
  @ViewChildren(ValueFlagInputComponent) vfComponents!: QueryList<ValueFlagInputComponent>;
  @ViewChildren(NumberInputComponent) totalComponents!: QueryList<NumberInputComponent>;

  @Input() public userFormSettings!: UserFormSettingStruct;

  @Input() public formDefinitions!: FormEntryDefinition;

  @Input() public refreshLayout!: boolean;

  @Input() public displayExtraInfoOption!: boolean;

  /** Emitted when observation value is changed */
  @Output() public userInputVF = new EventEmitter<ObservationDefinition>();

  /** Emitted when observation value or total value is changed */
  @Output() public totalIsValid = new EventEmitter<boolean>();

  @Output() public focusSaveButton = new EventEmitter<void>();

  /** Holds row entry fields needed for creating value flag components; elements, days, hours */
  protected rowFieldDefinitions!: FieldEntryDefinition[];

  /** Holds column entry fields needed for creating value flag components; elements, days, hours */
  protected colFieldDefinitions!: FieldEntryDefinition[];

  /** Holds all the observation definitions used  by created value flag components */
  protected observationsDefinitions!: ObservationDefinition[][];

  /** Holds the error message for total validation. Used by the total components of each column */
  protected totalErrorMessage!: string[];

  protected tableHeightStyle: string = '60vh';

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

    if (changes["userFormSettings"] && this.userFormSettings) {
      //this.tableHeightStyle = 'calc(100vh - 300px)';
      this.tableHeightStyle = `${this.userFormSettings.gridLayoutSettings.gridHeight}vh`;
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

    this.totalIsValid.emit(this.totalErrorMessage.every(str => str === undefined || str === ''));
  }


  protected onVFEnterKeyPressed(rowIndex: number, colIndex: number): void {
    // Below code enables vertical navigation on enter. 
    // TODO. Later we can implement horizontal navigation on enter once we test this considerably 

    const totalRows: number = this.rowFieldDefinitions.length; // Number of rows in the table
    const totalColumns: number = this.colFieldDefinitions.length; // Number of columns in the table
    let currentInputIndex: number;
    let nextInputIndex: number;

    // If total input is required and it's the last row then just focus the total component in the column
    if (this.formDefinitions.formMetadata.requireTotalInput && rowIndex === totalRows - 1) {
      const nextInput = this.totalComponents.get(colIndex);
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }

    if (rowIndex === totalRows - 1 && colIndex === totalColumns - 1) {
      // If it's the last row and column then focus the save button
      this.focusSaveButton.emit();
      return;
    } else if (rowIndex === totalRows - 1) {
      // If it's the last row, the first vf component of the next column should be next input's index
      nextInputIndex = colIndex + 1;
    } else {
      // Calculate the current input's index
      currentInputIndex = rowIndex * totalColumns + colIndex;
      // Calculate the next input's index (same column, next row)
      nextInputIndex = currentInputIndex + totalColumns;
    }

    //console.log('nextInputIndex', nextInputIndex)

    // Get the next input and set focus if it exists
    const nextInput = this.vfComponents.get(nextInputIndex);

    if (nextInput) {
      if (nextInput.disableValueFlagEntry) {
        // If vf component is disabled and it's the last column then just focus the save button
        if (colIndex === totalColumns - 1) {
          // Go save button
          this.focusSaveButton.emit();
          return;
        } else {
          // If vf component is the last column then just focus the first vf component of the next column ;
          const newNextInput = this.vfComponents.get(colIndex + 1);
          if (newNextInput) {
            newNextInput.focus();
          }
        }
      } else {
        nextInput.focus();
      }

    }


  }

  protected onTotalEnterKeyPressed(colIndex: number): void {
    const totalColumns: number = this.colFieldDefinitions.length; // Number of columns in the table

    // If it's the last row and column then focus the save button
    if (colIndex == totalColumns - 1) {
      // Go to save buton
      this.focusSaveButton.emit();
      return;
    }

    // the first item of the next column should be next input's index. S0 set focus if it exists
    const nextInput = this.vfComponents.get(colIndex + 1);
    if (nextInput) {
      nextInput.focus();
    }

  }

  public clear(): void {
    this.vfComponents.forEach(component => {
      component.clear();
    })
  }

  public sameInput(valueFlag: string, comment: string| null): void {
    this.vfComponents.forEach(component => {
      component.onSameValueInput(valueFlag, comment);
    })
  }



}
