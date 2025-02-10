import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter, QueryList, ViewChildren, ViewChild } from '@angular/core';
import { ViewPortSize, ViewportService } from 'src/app/core/services/view-port.service';
import { FormEntryDefinition } from '../defintions/form-entry.definition';
import { FieldEntryDefinition } from '../defintions/field.definition';
import { ObservationDefinition } from '../defintions/observation.definition';
import { UserFormSettingStruct } from '../user-form-settings/user-form-settings.component';
import { ValueFlagInputComponent } from '../value-flag-input/value-flag-input.component';
import { NumberInputComponent } from 'src/app/shared/controls/number-input/number-input.component';

@Component({
  selector: 'app-linear-layout',
  templateUrl: './linear-layout.component.html',
  styleUrls: ['./linear-layout.component.scss']
})
export class LnearLayoutComponent implements OnChanges {
  @ViewChildren(ValueFlagInputComponent) vfComponents!: QueryList<ValueFlagInputComponent>;
  @ViewChild('appTotal') totalComponent!: NumberInputComponent;

  @Input()
  public userFormSettings!: UserFormSettingStruct;

  @Input()
  public formDefinitions!: FormEntryDefinition;

  @Input()
  public refreshLayout!: boolean;

  @Input()
  public displayExtraInfoOption!: boolean;

  /** Emitted when observation value is changed */
  @Output()
  public userInputVF = new EventEmitter<ObservationDefinition>();

  /** Emitted when observation value or total value is changed */
  @Output()
  public totalIsValid = new EventEmitter<boolean>();

  /** Holds entry fields needed for creating value flag components; elements, days, hours */
  protected fieldDefinitions!: FieldEntryDefinition[];

  /** Holds a copy of the entry fields in chunks of 5. Suitable for large screen displays */
  protected fieldDefinitionsChunks!: FieldEntryDefinition[][];

  /** Holds all the observation definitions used  by created value flag components */
  protected observationsDefinitions!: ObservationDefinition[];

  /** Holds the error message for total validation. Used by the total component */
  protected totalErrorMessage!: string;

  /** Used to determine the layout to be used depending on the screen size */
  protected largeScreen: boolean = true;

  constructor(private viewPortService: ViewportService) {
    this.viewPortService.viewPortSize.subscribe((viewPortSize) => {
      this.largeScreen = viewPortSize === ViewPortSize.LARGE;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["refreshLayout"] && this.refreshLayout) {
      // Set up the field definitions for both layouts and the observation definitions for value flag components
      this.fieldDefinitions = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[0]);
      this.fieldDefinitionsChunks = this.getFieldDefsChunks(this.fieldDefinitions);
      this.observationsDefinitions = this.formDefinitions.obsDefsForLinearLayout;
    } else if (changes["userFormSettings"] && this.fieldDefinitions) {
      // Setting change could be related to maximum rows so reinitialise the chunks
      this.fieldDefinitionsChunks = this.getFieldDefsChunks(this.fieldDefinitions);
    }
  }

  /**
   * splits entry field defintions in chunks of 5 and returns a 2D array that can be used as columns and rows
   * @param fieldDefs 
   * @returns 
   */
  private getFieldDefsChunks(fieldDefs: FieldEntryDefinition[]): FieldEntryDefinition[][] {
    const chunks: FieldEntryDefinition[][] = [];
    const chunkSize: number = this.userFormSettings.linearLayoutSettings.maxRows;
    for (let i = 0; i < fieldDefs.length; i += chunkSize) {
      chunks.push(fieldDefs.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
  * Gets the observation definition of the specified entry field definition. 
  * Used when using the fieldDefinitionsChunks
  * @param fieldDef 
  * @returns 
  */
  protected getObservationDefByFieldDef(fieldDef: FieldEntryDefinition): ObservationDefinition {
    const index = this.fieldDefinitions.findIndex(item => item === fieldDef);
    return this.observationsDefinitions[index];
  }

  /**
   * Gets the observation definition of the specified by indexn. 
   * @param fieldDef 
   * @returns 
   */
  protected getObservationDefByIndex(index: number): ObservationDefinition {
    return this.observationsDefinitions[index];
  }

  /**
   * Handles observation value changes
   * Clears any total error message  
   */
  protected onUserInputVF(observationDef: ObservationDefinition): void {
    this.userInputVF.emit(observationDef);

    // Only emit total validity if the definition metadata requires it
    if (this.formDefinitions.formMetadata.requireTotalInput) {
      this.totalErrorMessage = '';
      this.totalIsValid.emit(false);
    }
  }

  /**
   * Handles total value changes by updating the internal state and emiting totalIsValid state
   * @param value 
   */
  protected onTotalValueChange(value: number | null): void {
    const expectedTotal = FormEntryDefinition.getTotalValuesOfObs(this.observationsDefinitions);
    this.totalErrorMessage = '';

    if (expectedTotal !== value) {
      this.totalErrorMessage = expectedTotal !== null ? `Expected total is ${expectedTotal}` : `No total expected`;
    }

    // If no error, then emit true. If error detected emit false
    this.totalIsValid.emit(this.totalErrorMessage === '');
  }

  public clear(): void {
    this.vfComponents.forEach(component => {
      component.clear();
    })
  }

  public sameInput(valueFlag: string, comment: string | null): void {
    this.vfComponents.forEach(component => {
      component.onSameValueInput(valueFlag, comment);
    })
  }


}
