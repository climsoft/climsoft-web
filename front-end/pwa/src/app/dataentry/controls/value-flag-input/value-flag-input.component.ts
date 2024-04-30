import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { FlagEnum } from 'src/app/core/models/observations/flag.enum';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { ViewObservationLogModel } from 'src/app/core/models/observations/view-observation-log.model';
import { ViewObservationLogQueryModel } from 'src/app/core/models/observations/view-observation-log-query.model';
import { take } from 'rxjs';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ObservationDefinition } from '../../form-entry/defintions/observation.definition';

/**
 * Component for data entry of observations
 */

@Component({
  selector: 'app-value-flag-input',
  templateUrl: './value-flag-input.component.html',
  styleUrls: ['./value-flag-input.component.scss']
})
export class ValueFlagInputComponent implements OnInit, OnChanges {
  @Input() public id: string | number = '';
  @Input() public label: string = '';
  @Input() public observationDefinition!: ObservationDefinition;
  @Input() public enforceLimitCheck: boolean = true;
  @Output() public valueChange = new EventEmitter<ObservationDefinition>();

  /** 
   * Holds the validation response used by input component to display error.
   * When not empty the observation validity should be false as well  
   */

  protected validationResponse: string = ''

  /** 
   * Holds the observation log used of the linked observation model
   * Used by the log controls
   */
  protected obsLog!: ViewObservationLogModel[];

  constructor(private observationService: ObservationsService) {

  }
  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    // reset the log
    this.obsLog = [];
  }


  /**
   * Event raised when input change is detected
   * @param valueFlagInput e.g 200, 200E, M, empty
   * @returns 
   */
  protected onInputEntry(valueFlagInput: string): void {

    // Validate input format validity. If there is a response then entry is invalid
    this.validationResponse = this.checkInputFormatValidity(valueFlagInput)
    if (!StringUtils.isNullOrEmpty(this.validationResponse)) {
      this.emitValueChange(false);
      return;
    }

    // Extract and set the value and flag
    const extractedScaledValFlag = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput);

    // Transform the value to actual scale 
    const value: number | null = extractedScaledValFlag[0] === null ? null : this.getUnScaledValue(extractedScaledValFlag[0]);

    // Transform the flag letter
    const flagLetter: string | null = extractedScaledValFlag[1] === null ? null : extractedScaledValFlag[1].toUpperCase();

    // If there is a value input then validate
    if (value !== null) {
      this.validationResponse = this.checkValueLimitsValidity(value);

      //If enforcement of limits is true and there is an error response then invalidate the observation
      if (this.enforceLimitCheck && !StringUtils.isNullOrEmpty(this.validationResponse)) {
        this.emitValueChange(false);
        return;
      }
    }

    // If there is a flag input then validate
    if (flagLetter !== null) {
      this.validationResponse = this.checkFlagValidity(value, flagLetter);
      if (!StringUtils.isNullOrEmpty(this.validationResponse)) {
        this.emitValueChange(false);
        return;
      }
    }

    // Set the value and flag to the observation model 
    this.observationDefinition.setValueFlag(value, flagLetter ? this.getFlag(flagLetter) : null)

    // Emit observation data change event
    this.emitValueChange(true);

  }

  private emitValueChange(observationValidity: boolean): void {
    this.observationDefinition.observationChangeIsValid = observationValidity;
    this.valueChange.emit(this.observationDefinition);
  }

  /**
   * Validates a value flag input by checking on acceptible formats
   * @param valueFlagInput 
   * @returns validation status and error message
   */
  private checkInputFormatValidity(valueFlagInput: string): string {
    // Check for emptiness
    if (StringUtils.isNullOrEmpty(valueFlagInput, false)) {
      return '';
    }

    // Check for white spaces.
    if (StringUtils.isNullOrEmpty(valueFlagInput, true)) {
      return 'Empty spaces not allowed';
    }

    // Check if it's all string. Applies when its flag M entered.
    if (StringUtils.doesNotContainNumericCharacters(valueFlagInput)) {
      return '';
    }

    // Check for correct input format.
    if (!StringUtils.containsNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput)) {
      return 'Incorrect input format not allowed';
    }

    // Check for any decimals.
    const splitNum: number | null = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput)[0];
    if (splitNum !== null && String(splitNum).includes('.')) {
      return 'Decimals not allowed';
    }

    return '';
  }

  private checkValueLimitsValidity(value: number): string {

    const element = this.observationDefinition.elementMetadata;

    // Get the scale factor to use. An element may not have a scale factor
    const scaleFactor: number = element.entryScaleFactor ? element.entryScaleFactor : 1;

    if (element.lowerLimit && value < element.lowerLimit) {
      return `Value less than lower limit ${element.lowerLimit * scaleFactor}`;
    }

    if (element.upperLimit && value > element.upperLimit) {
      return `Value higher than upper limit ${element.upperLimit * scaleFactor}`;
    }

    return '';
  }

  private checkFlagValidity(value: number | null, flag: string): string {
    const flagFound: FlagEnum | null = this.getFlag(flag);

    if (!flagFound) {
      return 'Invalid Flag';
    }

    if (value !== null && flagFound === FlagEnum.MISSING) {
      return 'Invalid Flag, M is used for missing value ONLY';
    }

    return '';
  }

  private getUnScaledValue(scaledValue: number): number {
    const element = this.observationDefinition.elementMetadata;
    return element.entryScaleFactor ? scaledValue / element.entryScaleFactor : scaledValue;
  }

  private getFlag(inputFlag: string): FlagEnum | null {
    return Object.values<FlagEnum>(FlagEnum).find(f => f[0].toLowerCase() === inputFlag[0].toLowerCase()) || null;
  }

  /**
   * Raised when Enter key is pressed on the input component
   */
  protected onEnterKeyPressed(): void {
    // If nothing has been input then put the M flag
    if (!this.observationDefinition.valueFlagForDisplay) {
      this.onInputEntry('M');
    }
  }


  /** Raised when the comment component has its value changed */
  protected onCommentEntry(comment: string) {
    this.observationDefinition.observation.comment = comment;
    this.valueChange.emit(this.observationDefinition);
  }

  /** Raised when the log component is displayed */
  protected loadObservationLog(): void {

    // Note the function is called twice, when drop down is opened and when it's closed
    // So this obsLog truthy check prevents unnecessary reloading

    if (this.obsLog && this.obsLog.length > 0) {
      // No need to reload the log
      return;
    }

    // Create an observation log query dto.
    const query: ViewObservationLogQueryModel = {
      stationId: this.observationDefinition.observation.stationId,
      elementId: this.observationDefinition.observation.elementId,
      sourceId: this.observationDefinition.observation.sourceId,
      elevation: this.observationDefinition.observation.elevation,
      datetime: this.observationDefinition.observation.datetime,
      period: this.observationDefinition.observation.period
    };

    this.observationService.findObsLog(query).pipe(
      take(1)
    ).subscribe(data => {

      // Transform the log data accordingly
      this.obsLog = data.map(item => {

        // Display the values in scaled form 
        if (item.value && this.observationDefinition.elementMetadata.entryScaleFactor) {
          // To remove rounding errors use Math.floor()
          item.value = Math.floor(item.value * this.observationDefinition.elementMetadata.entryScaleFactor);
        }

        // Convert the entry date time to current local time
        item.entryDateTime = DateUtils.getDateInSQLFormatFromDate(new Date(item.entryDateTime))

        return item;

      }

      )
    });

  }






}
