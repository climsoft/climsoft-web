import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormEntryUtil } from '../defintions/form-entry.util';
import { ViewPortSize, ViewportService } from 'src/app/core/services/view-port.service';
import { FormEntryDefinition } from '../defintions/form-entry.definition';
import { FieldEntryDefinition } from '../defintions/field.definition';
import { ObservationDefinition } from '../defintions/observation.definition';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-linear-layout',
  templateUrl: './linear-layout.component.html',
  styleUrls: ['./linear-layout.component.scss']
})
export class LnearLayoutComponent implements OnChanges {
  @Input()
  public formDefinitions!: FormEntryDefinition;

  /** Emitted when observation value is changed */
  @Output()
  public valueChange = new EventEmitter<ObservationDefinition>();

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

  protected displayHistoryOption: boolean = false;

  /** Used to determine the layout to be used depending on the screen size */
  protected largeScreen: boolean = true;

  constructor(private viewPortService: ViewportService) {
    this.viewPortService.viewPortSize.subscribe((viewPortSize) => {
      this.largeScreen = viewPortSize === ViewPortSize.LARGE;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    //only proceed with seting up the control if all inputs have been set.
    if (this.formDefinitions) {
      // Set up the field definitions for both layouts and the observation definitions for value flag components
      this.fieldDefinitions = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[0]);
      this.fieldDefinitionsChunks = this.getFieldDefsChunks(this.fieldDefinitions);
      this.observationsDefinitions = this.formDefinitions.getEntryObsForLinearLayout();
    } else {
      this.observationsDefinitions = [];
    }

  }

  /**
   * splits entry field defintions in chunks of 5 and returns a 2D array that can be used as columns and rows
   * @param fieldDefs 
   * @returns 
   */
  private getFieldDefsChunks(fieldDefs: FieldEntryDefinition[]): FieldEntryDefinition[][] {
    const chunks: FieldEntryDefinition[][] = [];
    const chunkSize: number = 5;
    for (let i = 0; i < fieldDefs.length; i += chunkSize) {
      chunks.push(fieldDefs.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Gets the observation definition of the specified entry field definition. 
   * @param fieldDef 
   * @returns 
   */
  protected getObservationDef(fieldDef: FieldEntryDefinition): ObservationDefinition {
    const index: number = this.fieldDefinitions.findIndex(data => (data === fieldDef));
    return this.observationsDefinitions[index];
  }

  /**
   * Handles observation value changes
   * Clears any total error message  
   */
  protected onValueChange(observationDef: ObservationDefinition): void {
    this.valueChange.emit(observationDef);

    // Only emit total validity if the definition metadata requires it
    if (this.formDefinitions.formMetadata.validateTotal) {
      this.totalErrorMessage = '';
      this.totalIsValid.emit(false);
    }

  }

  /**
   * Handles total value changes by updating the internal state and emiting totalIsValid state
   * @param value 
   */
  protected onTotalValueChange(value: number | null): void {
    const expectedTotal = FormEntryUtil.getTotalValuesOfObs(this.observationsDefinitions);
    this.totalErrorMessage = '';

    if (expectedTotal !== value) {
      this.totalErrorMessage = expectedTotal !== null ? `Expected total is ${expectedTotal}` : `No total expected`;
    }

    // If no error, then emit true. If error detected emit false
    this.totalIsValid.emit(this.totalErrorMessage === '');
  }

  /**
   * Updates its internal state depending on the options passed
   * @param option  'Clear' | 'History'
   */
  protected onOptions(option: 'Clear' | 'History'): void {
    switch (option) {
      case 'Clear':
        this.clear();
        break;
      case 'History':
        this.displayHistoryOption = !this.displayHistoryOption;
        break;
    }
  }

  /**
  * Clears all the observation value fflags if they are not cleared and updates its internal state
  */
  private clear(): void {
    this.observationsDefinitions.forEach(obsDef => {
      // Check if value flag is already empty
      if (!StringUtils.isNullOrEmpty(obsDef.valueFlagForDisplay)) {
        // Clear the value flag input
        obsDef.setValueFlagFromInput('', this.formDefinitions.formMetadata.enforceLimitCheck);

        // Raise the value change 
        this.onValueChange(obsDef);
      }

      return obsDef;

    });

    // Set total as valid, because everything has been cleared
    if (this.formDefinitions.formMetadata.validateTotal) {
      this.totalIsValid.emit(true);
    }
  }


}
