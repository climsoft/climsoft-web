import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { FormEntryUtil } from '../../form-entry/form-entry.util';
import { FlagEnum } from 'src/app/core/models/observations/flag.enum';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { ViewObservationLogModel } from 'src/app/core/models/observations/view-observation-log.model';
import { ViewObservationLogQueryModel } from 'src/app/core/models/observations/view-observation-log-query.model';
import { take } from 'rxjs';
import { DateUtils } from 'src/app/shared/utils/date.utils';


//validation interface local to this component only
interface ValidationResponse {
  isValid: boolean;
  message: string;
}

@Component({
  selector: 'app-value-flag-input',
  templateUrl: './value-flag-input.component.html',
  styleUrls: ['./value-flag-input.component.scss']
})
export class ValueFlagInputComponent implements OnInit, OnChanges {
  @Input() public id: string | number = '';
  @Input() public label: string = '';
  @Input() public elements!: ViewElementModel[];
  @Input() public observation!: CreateObservationModel;
  @Output() public valueChange = new EventEmitter<CreateObservationModel>();
  @Output() public inputBlur = new EventEmitter<CreateObservationModel>();

  protected displayedValueFlag!: string;
  protected validationResults!: ValidationResponse;
  protected obsLog!: ViewObservationLogModel[];

  constructor(private observationService: ObservationsService) {

  }
  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (!this.elements || !this.observation) {
      return;
    }

    //scale the value for display
    let value: number | null = this.observation.value;
    const element = this.elements.find(data => data.id === this.observation.elementId);
    if (value !== null && element) {
      value = FormEntryUtil.getScaledValue(element, value);
    }

    this.displayedValueFlag = this.getValueFlagForDisplay(value, FormEntryUtil.checkFlagValidity(this.observation.flag));

  }

  protected onInputEntry(valueFlagInput: string): void {

    //set the new input value as the displayed value. Important for when the value is invalid even after enter key press
    this.displayedValueFlag = valueFlagInput;

    //validate value flag
    this.validationResults = this.validateValueFlagInput(valueFlagInput)

    //check validation results
    if (!this.validationResults.isValid) {
      return;
    }

    //extract and set the value and flag
    const extractedNumberString = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput);
    const value: number | null = extractedNumberString[0];
    const flagLetter: string | null = extractedNumberString[1] === null ? null : extractedNumberString[1].toUpperCase();

    //if value input then do QC
    if (value !== null) {
      this.validationResults = this.validateAndQCValue(this.observation.elementId, value);
      if (!this.validationResults.isValid) {
        return;
      }
    }

    //if flag input then validate
    if (flagLetter !== null) {
      this.validationResults = this.validateAndQCFlag(value, flagLetter);
      if (!this.validationResults.isValid) {
        return;
      }
    }

    //set the value and flag
    this.observation.value = value === null ? null : this.getUnScaledValue(this.observation.elementId, value);
    this.observation.flag = FormEntryUtil.checkFlagValidity(flagLetter);

    //scale the value for display 
    this.displayedValueFlag = this.getValueFlagForDisplay(value, this.observation.flag);

    // Emit data change event
    this.valueChange.emit(this.observation);

  }


  //returns validation status and error message
  private validateValueFlagInput(valueFlagInput: string): ValidationResponse {
    if (StringUtils.isNullOrEmpty(valueFlagInput, false)) {
      return { isValid: true, message: '' };
    }

    // Check for white spaces.
    if (StringUtils.isNullOrEmpty(valueFlagInput, true)) {
      return { isValid: false, message: 'Empty spaces not allowed' };
    }

    // Check if it's all string. Applies when its flag M entered.
    if (StringUtils.doesNotContainNumericCharacters(valueFlagInput)) {
      return { isValid: true, message: '' };
    }

    // Check for correct input format.
    if (!StringUtils.containsNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput)) {
      return { isValid: false, message: 'Incorrect input format not allowed' };
    }

    // Check for any decimals.
    const splitNum: number | null = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput)[0];
    if (splitNum !== null && String(splitNum).includes('.')) {
      return { isValid: false, message: 'Decimals not allowed' };
    }

    return { isValid: true, message: '' };
  }

  private validateAndQCValue(elementId: number, value: number): ValidationResponse {
    const element = this.elements.find(data => data.id === elementId);

    if (!element) {
      return { isValid: false, message: 'Element NOT found' };
    }

    // Transform the value to actual scale to validate the limits
    value = this.getUnScaledValue(elementId, value);

    let scaleFactor: number = 1;

    if (element.entryScaleFactor) {
      scaleFactor = element.entryScaleFactor;
    }

    if (element.lowerLimit && value < element.lowerLimit) {
      return { isValid: false, message: `Value less than lower limit ${element.lowerLimit * scaleFactor}` };
    }

    if (element.upperLimit && value > element.upperLimit) {
      return { isValid: false, message: `Value higher than upper limit ${element.upperLimit * scaleFactor}` };
    }

    return { isValid: true, message: '' };
  }


  private validateAndQCFlag(value: number | null, flagId: string): ValidationResponse {
    const flagFound: FlagEnum | null = FormEntryUtil.checkFlagValidity(flagId);

    if (!flagFound) {
      return { isValid: false, message: 'Invalid Flag' };
    }

    if (value !== null && flagFound === FlagEnum.MISSING) {
      return { isValid: false, message: 'Invalid Flag, M is used for missing value ONLY' };
    }

    return { isValid: true, message: '' };
  }

  private getValueFlagForDisplay(value: number | null, flagEnum: FlagEnum | null): string {
    if (value === null && flagEnum === null) {
      return '';
    }

    const valueStr = value !== null ? value.toString() : '';
    const flagStr = flagEnum !== null ? flagEnum[0].toUpperCase() : '';

    return valueStr + flagStr;
  }

  private getUnScaledValue(elementId: number, scaledValue: number): number {
    const element = this.elements.find(data => data.id === elementId);
    return element && element.entryScaleFactor && element.entryScaleFactor !== 0 ? scaledValue / element.entryScaleFactor : scaledValue;
  }

  protected onEnterKeyPressed(): void {
    // If nothing has been input then put the M flag
    // TODO. this hard coded file should come from a config file?
    if (!this.displayedValueFlag) {
      this.onInputEntry('M');
    }
  }

  protected onInputBlur(): void {
    this.inputBlur.emit(this.observation);
  }

  protected onCommentEntry(comment: string) {
    this.observation.comment = comment;
    this.valueChange.emit(this.observation);
  }


  protected loadObservationLog(): void {

    // Note the function twice, when drop down is opened and when it's closed
    // So this obsLog truthy check prevents unnecessary reloading

    if (this.obsLog) {
      // No need to reload the log
      return;
    }

    const query: ViewObservationLogQueryModel = {
      stationId: this.observation.stationId,
      elementId: this.observation.elementId,
      sourceId: this.observation.sourceId,
      elevation: this.observation.elevation,
      datetime: this.observation.datetime,
      period: this.observation.period
    };

    this.observationService.findObsLog(query).pipe(
      take(1)
    ).subscribe(data => {
      // Convert the entry date time to current local time
      this.obsLog = data.map(item => {

        if (item.value !== null) {
          const element = this.elements.find(data => data.id === this.observation.elementId);
          if (element) {
            item.value = FormEntryUtil.getScaledValue(element, item.value);
          }
        }
        item.entryDateTime = DateUtils.getDateInSQLFormatFromDate(new Date(item.entryDateTime))
        return item;

      }

      )
    });

  }






}
