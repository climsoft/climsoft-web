import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { FormEntryUtil } from '../../form-entry/defintions/form-entry.util';
import { FlagEnum } from 'src/app/core/models/observations/flag.enum';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { ViewObservationLogModel } from 'src/app/core/models/observations/view-observation-log.model';
import { ViewObservationLogQueryModel } from 'src/app/core/models/observations/view-observation-log-query.model';
import { take } from 'rxjs';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { ObservationDefinition } from '../../form-entry/defintions/observation.definition';


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
  @Input() public observationDefinition!: ObservationDefinition;
  @Output() public valueChange = new EventEmitter<CreateObservationModel>();
  @Output() public inputBlur = new EventEmitter<CreateObservationModel>();

  protected validationResults!: ValidationResponse;
  protected obsLog!: ViewObservationLogModel[];

  constructor(private observationService: ObservationsService) {

  }
  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

  }

  protected onInputEntry(valueFlagInput: string): void {

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
      this.validationResults = this.validateAndQCValue(value);
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
    this.observationDefinition.observation.value = value === null ? null : this.getUnScaledValue(value);
    this.observationDefinition.observation.flag = FormEntryUtil.checkFlagValidity(flagLetter);


    // Emit data change event
    this.valueChange.emit(this.observationDefinition.observation);

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

  private validateAndQCValue(value: number): ValidationResponse {


    // Transform the value to actual scale to validate the limits
    value = this.getUnScaledValue(value);

    let scaleFactor: number = 1;

    const element = this.observationDefinition.elementMetadata;
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



  // TODO. Deprecate this.
  private getUnScaledValue(scaledValue: number): number {
    const element = this.observationDefinition.elementMetadata;
    return element.entryScaleFactor && element.entryScaleFactor !== 0 ? scaledValue / element.entryScaleFactor : scaledValue;
  }

  protected onEnterKeyPressed(): void {
    // If nothing has been input then put the M flag
    // TODO. this hard coded file should come from a config file?
    if (!this.observationDefinition.ValueFlagForDisplay) {
      this.onInputEntry('M');
    }
  }

  protected onInputBlur(): void {
    this.inputBlur.emit(this.observationDefinition.observation);
  }

  protected onCommentEntry(comment: string) {
    this.observationDefinition.observation.comment = comment;
    this.valueChange.emit(this.observationDefinition.observation);
  }

  protected loadObservationLog(): void {

    // Note the function twice, when drop down is opened and when it's closed
    // So this obsLog truthy check prevents unnecessary reloading

    if (this.obsLog) {
      // No need to reload the log
      return;
    }

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
      // Convert the entry date time to current local time
      this.obsLog = data.map(item => {

        if (item.value !== null) {
          item.value = FormEntryUtil.getScaledValue(this.observationDefinition.elementMetadata, item.value);
        }
        item.entryDateTime = DateUtils.getDateInSQLFormatFromDate(new Date(item.entryDateTime))
        return item;

      }

      )
    });

  }






}
