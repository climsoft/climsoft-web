import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormEntryUtil } from '../defintions/form-entry.util';
import { ViewPortSize, ViewportService } from 'src/app/core/services/view-port.service';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { FormEntryDefinition } from '../defintions/form-entry.definition';
import { FieldEntryDefinition } from '../defintions/field.definition';
import { ObservationDefinition } from '../defintions/observation.definition';

@Component({
  selector: 'app-linear-layout',
  templateUrl: './linear-layout.component.html',
  styleUrls: ['./linear-layout.component.scss']
})
export class LnearLayoutComponent implements OnInit, OnChanges {
  @Input() public formDefinitions!: FormEntryDefinition;
  @Input() public clearValues!: boolean;

  @Output() public valueChange = new EventEmitter<ObservationDefinition>();
  @Output() public totalIsValid = new EventEmitter<boolean>();

  /** Holds entry fields needed for creating value flag components; elements, days, hours */
  protected fieldDefinitions!: FieldEntryDefinition[];

  /** Holds a copy of the entry fields in chunks of 5. Suitable for large screen displays */
  protected fieldDefinitionsChunks!: FieldEntryDefinition[][];

  /** Holds all the observation definitions used to by created value flag components */
  protected observationsDefinitions!: ObservationDefinition[];

  /** Holds the error message for total validation */
  protected totalErrorMessage!: string;

  /** Used to determine the layout to be used depending on the screen size */
  protected largeScreen: boolean = true;

  constructor(private viewPortService: ViewportService) {
    this.viewPortService.viewPortSize.subscribe((viewPortSize) => {
      this.largeScreen = viewPortSize === ViewPortSize.LARGE;
    });
  }

  ngOnInit(): void {
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

    console.log(' operations called', changes);
    if (this.clearValues) {
      console.log('clear operations called');
      for (const obsDef of this.observationsDefinitions) {
        obsDef.setValueFlag(null, null);
      }
      this.clearValues = false;
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
   * Used when creating value flag components in this component
   * @param fieldDef 
   * @returns 
   */
  protected getObservationDef(fieldDef: FieldEntryDefinition): ObservationDefinition {
    const index: number = this.fieldDefinitions.findIndex(data => (data === fieldDef));
    return this.observationsDefinitions[index];
  }

  /**
   * Raised by value flag component when its value changes.
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
   * Raised by the total component when its value changes
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




}
