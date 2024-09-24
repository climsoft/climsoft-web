import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { ObservationDefinition } from '../defintions/observation.definition';

/**
 * Component for data entry of observations
 */

@Component({
  selector: 'app-value-flag-input',
  templateUrl: './value-flag-input.component.html',
  styleUrls: ['./value-flag-input.component.scss']
})
export class ValueFlagInputComponent implements OnChanges {
  @Input()
  public id: string = '';

  @Input()
  public label: string = '';

  @Input()
  public observationDefinition!: ObservationDefinition;

  @Input()
  public displayHistoryOption: boolean = false;

  @Input()
  public disableValueFlagEntry: boolean = false;

  @Output()
  public valueChange = new EventEmitter<ObservationDefinition>();

  protected showChanges: boolean = false;

  constructor(private observationService: ObservationsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["observationDefinition"] && !changes["disableValueFlagEntry"]) {
      // Disable entry of future dates, excluding hour because the observation date times are in UTC.
      const obsDate = new Date(this.observationDefinition.observation.datetime);
      const nowDate = new Date();
      this.disableValueFlagEntry = new Date(obsDate.getFullYear(), obsDate.getMonth(), obsDate.getDate()) > new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
    }

    
  }

  /**
   * Handles input change and updates its internal state
   * @param valueFlagInput e.g '200', '200E', 'M', '
   * @returns 
   */
  protected onInputEntry(valueFlagInput: string): void {
    // Validate input format validity. If there is a response then entry is invalid
    this.observationDefinition.updateValueFlagFromUserInput(valueFlagInput);
    this.valueChange.emit(this.observationDefinition);

    // Show changes when user has input a valid changed value.
    // Note this is placed here because we want to show the change only after user input.
    this.showChanges = this.observationDefinition.observationChangeIsValid && this.observationDefinition.observationChanged;
  }

  /**
   * Hnadles Enter key pressed and updates its internal state
   */
  protected onEnterKeyPressed(): void {
    // If nothing has been input then put the M flag
    if (!this.observationDefinition.valueFlagForDisplay) {
      this.onInputEntry('M');
    }
  }

  /**
   * Raised when the comment component has its value changed
   */
  protected onCommentEntry(comment: string): void {
    this.observationDefinition.updateCommentInput(comment);
    this.valueChange.emit(this.observationDefinition);
  }

  /**
   * Raised when the log component is displayed 
   */
  protected loadObservationLog(): void {
    this.observationDefinition.loadObservationLog(this.observationService);
  }

}
