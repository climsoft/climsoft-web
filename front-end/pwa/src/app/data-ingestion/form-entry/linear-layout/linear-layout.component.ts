import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter, QueryList, ViewChildren, ViewChild, OnDestroy } from '@angular/core';
import { ViewPortSize, ViewportService } from 'src/app/core/services/view-port.service';
import { FormEntryDefinition } from '../defintitions/form-entry.definition';
import { FieldEntryDefinition } from '../defintitions/field.definition';
import { ObservationDefinition } from '../defintitions/observation.definition';
import { UserFormSettingStruct } from '../user-form-settings/user-form-settings.component';
import { ValueFlagInputComponent } from '../value-flag-input/value-flag-input.component';
import { NumberInputComponent } from 'src/app/shared/controls/number-input/number-input.component';
import { Subject, take, takeUntil } from 'rxjs';

@Component({
  selector: 'app-linear-layout',
  templateUrl: './linear-layout.component.html',
  styleUrls: ['./linear-layout.component.scss']
})
export class LnearLayoutComponent implements OnChanges, OnDestroy {
  @ViewChildren(ValueFlagInputComponent) vfComponents!: QueryList<ValueFlagInputComponent>;
  @ViewChild('appTotal') totalComponent!: NumberInputComponent;

  @Input()
  public userFormSettings!: UserFormSettingStruct;

  @Input()
  public formDefinitions!: FormEntryDefinition;

  @Input()
  public refreshLayout!: boolean;

  @Output()
  public focusSaveButton = new EventEmitter<void>();

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
  protected layoutHeight: number = 60;

  private destroy$ = new Subject<void>();

  constructor(private viewPortService: ViewportService) {
    this.viewPortService.viewPortSize.pipe(
      takeUntil(this.destroy$),
    ).subscribe((viewPortSize) => {
      this.largeScreen = viewPortSize === ViewPortSize.LARGE;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["refreshLayout"] && this.refreshLayout) {
      // Set up the field definitions for both layouts and the observation definitions for value flag components
      this.fieldDefinitions = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[0]);
      this.fieldDefinitionsChunks = this.getFieldDefsChunks(this.fieldDefinitions);
      this.observationsDefinitions = this.formDefinitions.obsDefsForLinearLayout;
    }


    if (changes["userFormSettings"] && this.userFormSettings) {
      // The height may not exist due to previous releases
      if (this.userFormSettings.linearLayoutSettings.height) this.layoutHeight = this.userFormSettings.linearLayoutSettings.height;
      if (this.fieldDefinitions) {
        // Setting change could be related to maximum rows so reinitialise the chunks
        this.fieldDefinitionsChunks = this.getFieldDefsChunks(this.fieldDefinitions);
      }

    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  // TODO. Check if sumulate tab is sufficient. After confirmation delete this code
  // protected onVFEnterKeyPressed(index: number): void {
  //   // Below code enables vertical navigation on enter. 
  //   // TODO. Later we can implement horizontal navigation on enter once we test this considerably 

  //   const totalRows: number = this.fieldDefinitions.length; // Number of rows in the table 
  //   let nextInputIndex: number;

  //   // If total input is required and it's the last row then just focus the total component in the column
  //   if (this.formDefinitions.formMetadata.requireTotalInput && index === totalRows - 1) {
  //     this.totalComponent.focus();
  //     return;
  //   }

  //   if (index === totalRows - 1) {
  //     // If it's the last row  then focus the save button
  //     this.focusSaveButton.emit();
  //     return;
  //   } else {
  //     nextInputIndex = index + 1;
  //   }

  //   // Get the next input and set focus if it exists
  //   const nextInput = this.vfComponents.get(nextInputIndex);

  //   if (nextInput) {
  //     if (nextInput.disableValueFlagEntry) {
  //       this.focusSaveButton.emit();
  //     } else {
  //       nextInput.focus();
  //     }
  //   }

  // }

  protected onTotalEnterKeyPressed(): void {
    if (!this.totalComponent.errorMessage) {
      // Go to save buton
      this.focusSaveButton.emit();
    }
  }

  public clear(): void {
    this.vfComponents.forEach(component => {
      component.clear();
    });
  }

  public sameInput(valueFlag: string, comment: string | null): void {
    this.vfComponents.forEach(component => {
      component.onSameValueInput(valueFlag, comment);
    });
  }

  public setFocusToFirstVF(): void {
    // For some reason focus is not set on the first value flag control 
    // when the below code is called immediately after refreshing this layout
    setTimeout(() => {
      if (this.vfComponents && this.vfComponents.length > 0) {
        this.vfComponents.first.focus();
      }
    }, 0);
  }

}
