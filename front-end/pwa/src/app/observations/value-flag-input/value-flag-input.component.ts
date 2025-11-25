import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TextInputComponent } from 'src/app/shared/controls/text-input/text-input.component';
import { ViewObservationLogModel } from 'src/app/data-ingestion/models/view-observation-log.model';
import { ViewObservationModel, ViewQCTestLog } from 'src/app/data-ingestion/models/view-observation.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { FlagEnum } from 'src/app/data-ingestion/models/flag.enum';
import { RangeThresholdQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/range-qc-test-params.model';
import { QCTestTypeEnum } from 'src/app/metadata/qc-tests/models/qc-test-type.enum';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { FormEntryDefinition } from 'src/app/data-ingestion/data-entry/form-entry/defintitions/form-entry.definition';
import { QCTestCacheModel } from 'src/app/metadata/qc-tests/services/qc-tests-cache.service';
import { ObservationEntry } from '../models/observation-entry.model';
import { ElementCacheModel } from 'src/app/metadata/elements/services/elements-cache.service';

/**
 * Component for data entry of observations
 */

@Component({
  selector: 'app-value-flag-input',
  templateUrl: './value-flag-input.component.html',
  styleUrls: ['./value-flag-input.component.scss']
})
export class ValueFlagInputComponent implements OnChanges {
  @ViewChild('appTextInput') textInputComponent!: TextInputComponent;

  @Input() public id!: string;

  @Input() public label!: string;

  @Input() public borderSize!: number;

  @Input() public observationEntry!: ObservationEntry;

  /**
 * Determines whether the value input will be scaled or not (using the element entry factor).
 * Also determines whether _valueFlagForDisplay will be ins scaled or unscaled format. 
 */
  @Input() public scaleValue: boolean = true;

  @Input() public displayExtraInfoOption: boolean = false;

  @Input() public disableValueFlagEntry: boolean = false;

  @Input() public simulateTabOnEnter: boolean = false;

  // Used by form entry to disable input of data when its already entered using a different source
  @Input() public duplicateObservations!: Map<string, ViewObservationModel>;

  @Output() public userInputVF = new EventEmitter<ObservationEntry>();

  @Output() public enterKeyPress = new EventEmitter<void>();

  protected activeTab: 'new' | 'history' | 'qctests' = 'new';
  protected displayExtraInfoDialog: boolean = false;
  protected duplicateObservation: ViewObservationModel | undefined;
  protected viewObservationLog!: ViewObservationLogModel[];
  protected duplicateObservationLog!: ViewObservationLogModel[];
  protected viewQCTestLog!: ViewQCTestLog[];
  protected comment: string = '';


  // Holds original value, flag and comment  values
  private originalValues: string = '';


  // Holds the validation error message when value flag is invalid.
  protected validationErrorMessage: string = '';

  // Holds the validation warning message when value flag is invalid.
  protected validationWarningMessage: string = '';

  protected valueFlagInput: string = '';
  private element!: ElementCacheModel;

  constructor(private cachedMetadataService: CachedMetadataService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observationEntry'] && this.observationEntry) {
      this.element = this.cachedMetadataService.getElement(this.observationEntry.observation.elementId);
      this.valueFlagInput = this.getValueFlagString(this.observationEntry.observation.value, this.observationEntry.observation.flag);
      this.comment = this.observationEntry.observation.comment ? this.observationEntry.observation.comment : '';
      // set original database values for future comparison
      this.originalValues = `${this.valueFlagInput}-${this.comment}`;
    }

    if (changes['duplicateObservations'] && this.duplicateObservations && this.observationEntry) {
      this.duplicateObservation = this.duplicateObservations.get(`${this.observationEntry.observation.elementId}-${this.observationEntry.observation.datetime}`);
      if (this.duplicateObservation ) {
        // If duplicate exist then disable entry.
        this.disableValueFlagEntry = true;

        // If there is no value flag, e.g it's an attempt to enter a new record, then show the duplicate values
        if (this.valueFlagInput === '') {
          this.valueFlagInput = this.getValueFlagString(this.duplicateObservation.value, this.duplicateObservation.flag);
          this.comment = this.duplicateObservation.comment ? this.duplicateObservation.comment : '';
        }
      }
    }

  }

  private getValueFlagString(value: number | null, flag: FlagEnum | null): string {
    let valueStr;
    const flagStr = flag === null ? '' : flag[0].toUpperCase();

    // If scaling is on and entry scale factor is >=10 then just add zero.
    // TODO this could be implemented later to factor when the scale is like 100
    if (value === null) {
      valueStr = '';
    } else if (this.scaleValue) {
      valueStr = FormEntryDefinition.getUnScaledValue(this.element, value).toString();
      if (this.element.entryScaleFactor >= 10 && valueStr.length === 1) {
        valueStr = `0${valueStr}`;
      }
    } else {
      valueStr = value.toString();
    }

    return `${valueStr}${flagStr}`;
  }

  public focus(): void {
    this.textInputComponent.focus();
  }

  /**
   * Handles input change and updates its internal state
   * @param valueFlagInput e.g '200', '200E', 'M', '
   * @returns 
   */
  protected onInputEntry(valueFlagInput: string): void {
    // Validate input format validity. If there is a response then entry is invalid
    this.validateAndUpdateValueFlagFromUserInput(valueFlagInput);
    this.userInputVF.emit(this.observationEntry);
  }

  /**
   * Handles Enter key pressed and updates its internal state
   */
  protected onEnterKeyPressed(): void {
    // If nothing has been input then put the M flag
    if (!this.valueFlagInput) {
      this.onInputEntry('M');
    }

    // Emit the enter key press event
    this.enterKeyPress.emit();
  }

  public onSameValueInput(valueFlagInput: string, comment: string): void {
    if (this.disableValueFlagEntry || this.valueFlagInput !== '') {
      return;
    }

    const newComment: string = comment.trim();
    if (newComment !== '') {
      this.validateAndUpdateValueFlagFromUserInput(valueFlagInput, newComment);
    } else {
      // if no comment was typed, then don't overwrite the comment
      this.validateAndUpdateValueFlagFromUserInput(valueFlagInput);
    }
    this.userInputVF.emit(this.observationEntry);
  }

  public clear(): void {
    if (this.disableValueFlagEntry) {
      return;
    }
    this.validateAndUpdateValueFlagFromUserInput('', '');
    this.userInputVF.emit(this.observationEntry);
  }

  //----------------------------------------
  // Extra information functionality

  protected onDisplayExtraInfoOptionClick(): void {
    // If value flag is disabled then new comment tab will not be shown. So just show the history tab
    // Else just show the tab that the user had last clicked on
    if (this.disableValueFlagEntry) {
      this.onTabChange('history');
    }
    this.displayExtraInfoDialog = true;

  }

  protected onTabChange(selectedTab: 'new' | 'history' | 'qctests'): void {
    this.activeTab = selectedTab;
    switch (this.activeTab) {
      case 'history':
        // If there is a duplicate and this is new entry then no need to show the log table for the new entry
        if (!(this.duplicateObservation && this.observationEntry.observation.log.length === 0)) {
          this.viewObservationLog = this.formatObservationLog(this.observationEntry.observation.log);
        }

        // If there is a duplicate then show the log for the duplicate as well
        if (this.duplicateObservation) {
          this.duplicateObservationLog = this.formatObservationLog(this.duplicateObservation.log);
        }

        break;
      case 'qctests':
        this.viewQCTestLog = [];
        if (this.observationEntry.observation.qcTestLog) {
          for (const obsQcTestLog of this.observationEntry.observation.qcTestLog) {
            const qcTestMetadata = this.cachedMetadataService.getQCTest(obsQcTestLog.qcTestId);
            this.viewQCTestLog.push({ id: obsQcTestLog.qcTestId, name: qcTestMetadata.name, qcStatus: obsQcTestLog.qcStatus })
          }
        }
        break;
      default:
        break;
    }

  }

  protected onExtraInfoOkClicked(): void {
    // If comment is changed then update the comment
    if (this.comment !== this.observationEntry.observation.comment) {
      this.validateAndUpdateValueFlagFromUserInput(this.valueFlagInput, this.comment);
      this.userInputVF.emit(this.observationEntry);
    }
  }


  /**
   * Checks validity of the value flag input and if valid sets it as the new value for observation value and flag.
   * Updates it's internal state depending on the validity of the value flag input
   * @param valueFlagInput  e.g '200', '200E', 'M', ''
   * @param enforceLimitCheck whether to enforce limit check or not
   * @returns empty string if value flag contents are valid, else returns the error message.
   */
  private validateAndUpdateValueFlagFromUserInput(userInput: string, commentInput?: string): void {
    // Important, trim any white spaces (empty values will always be ignored)
    const newValueFlagInput = userInput.trim();
    this.validationErrorMessage = '';
    this.validationWarningMessage = '';

    // Validate input format validity. If there is a response then entry is invalid
    this.validationErrorMessage = this.checkInputFormatValidity(newValueFlagInput);
    if (this.validationErrorMessage !== '') {
      this.observationEntry.change = 'invalid_change';
      return;
    }

    // Extract and set the value and flag
    const extractedScaledValFlag = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(newValueFlagInput);

    let value: number | null;
    if (this.scaleValue && extractedScaledValFlag[0] !== null) {
      // Transform the value to actual scale 
      const element = this.cachedMetadataService.getElement(this.observationEntry.observation.elementId);
      value = element.entryScaleFactor ? extractedScaledValFlag[0] / element.entryScaleFactor : extractedScaledValFlag[0];
    } else {
      value = extractedScaledValFlag[0];
    }

    // Transform the flag letter
    const flagLetter: string | null = extractedScaledValFlag[1] === null ? null : extractedScaledValFlag[1].toUpperCase();

    // If there is a value input then validate
    if (value !== null) {
      this.validationWarningMessage = this.checkValueLimitsValidity(value);
    }

    // If there is a flag input then validate
    if (flagLetter !== null) {
      this.validationErrorMessage = this.checkFlagLetterValidity(value, flagLetter);
      if (this.validationErrorMessage !== '') {
        this.observationEntry.change = 'invalid_change';
        return;
      }
    }

    // Set the value and flag to the observation model 
    this.observationEntry.observation.value = value;
    this.observationEntry.observation.flag = flagLetter ? this.findFlag(flagLetter) : null;


    if (commentInput !== undefined) {
      this.observationEntry.observation.comment = commentInput.trim();
    }

    this.valueFlagInput = newValueFlagInput;
    this.comment = this.observationEntry.observation.comment ? this.observationEntry.observation.comment : '';

    if (`${this.valueFlagInput}-${this.comment}` === this.originalValues) {
      this.observationEntry.change = 'no_change';
    } else if (this.observationEntry.observation.value === null && this.observationEntry.observation.flag === null) {
      this.validationErrorMessage = 'Value and flag cannot be both empty. To clear the field, clear the comment'
      this.observationEntry.change = 'invalid_change';
    } else {
      this.observationEntry.change = 'valid_change';
    }
  }

  /**
   * Validates a value flag input by checking on acceptible input formats
   * @param valueFlagInput 
   * @returns empty string if valid
   */
  private checkInputFormatValidity(valueFlagInput: string): string {
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
    if (splitNum !== null) {
      if (this.scaleValue && String(splitNum).includes('.')) return 'Decimals not allowed';
    }

    return '';
  }

  /**
   * Validates the value against the element limits
   * @param value Unscaled value
   * @returns empty string if value is valid.
   */
  private checkValueLimitsValidity(value: number): string {
    // If no range thresholds given, then return empty, no need for validations
    const rangeThresholds = this.cachedMetadataService.getQCTestsFor(
      this.observationEntry.observation.elementId, this.observationEntry.observation.level, this.observationEntry.observation.interval)
      .filter(item => item.qcTestType === QCTestTypeEnum.RANGE_THRESHOLD);// 

    if (rangeThresholds.length === 0) {
      return '';
    }

    const rangeThreshold = rangeThresholds[0].parameters as RangeThresholdQCTestParamsModel;

    const element = this.cachedMetadataService.getElement(this.observationEntry.observation.elementId);;
    // Get the scale factor to use. An element may not have a scale factor
    const scaleFactor: number = element.entryScaleFactor ? element.entryScaleFactor : 1;

    if (value < rangeThreshold.lowerThreshold) {
      return `Value less than lower limit ${rangeThreshold.lowerThreshold * scaleFactor}`;
    }

    if (value > rangeThreshold.upperThreshold) {
      return `Value higher than upper limit ${rangeThreshold.upperThreshold * scaleFactor}`;
    }

    return '';
  }

  /**
   * Validates the flag letter. 
   * @param value 
   * @param flagLetter 
   * @returns empty string if valid
   */
  private checkFlagLetterValidity(value: number | null, flagLetter: string): string {
    if (flagLetter.length > 1) {
      return 'Invalid Flag, single letter expected';
    }

    const flagFound: FlagEnum | null = this.findFlag(flagLetter);
    if (!flagFound) {
      return 'Invalid Flag';
    }

    if (!this.cachedMetadataService.getSource(this.observationEntry.observation.sourceId).allowMissingValue && flagFound === FlagEnum.MISSING) {
      return 'Missing value not allowed';
    }

    if (value !== null && flagFound === FlagEnum.MISSING) {
      return 'Invalid Flag, M is used for missing observations ONLY e.g when no observation was made.';
    }

    if (value !== null && flagFound === FlagEnum.OBSCURED) {
      return 'Invalid Flag, O or / is used for obscured observations ONLY e.g obscured middle and higher level cloud';
    }

    if (value !== null && flagFound === FlagEnum.VARIABLE) {
      return 'Invalid Flag, V is used for variable observations ONLY e.g variable wind';
    }

    if (value === null && flagFound !== FlagEnum.MISSING && flagFound !== FlagEnum.OBSCURED && flagFound !== FlagEnum.VARIABLE) {
      return 'Invalid Flag, use M for missing, O or / for obscure and V for variable observation';
    }

    return '';
  }


  private findFlag(inputFlag: string): FlagEnum | null {
    if (inputFlag === '/') {
      inputFlag = FlagEnum.OBSCURED;
    }

    return Object.values<FlagEnum>(FlagEnum).find(f => f[0].toLowerCase() === inputFlag[0].toLowerCase()) || null;
  }

  private formatObservationLog(viewObservationLog: ViewObservationLogModel[]): ViewObservationLogModel[] {
    // Transform the log data accordingly
    return viewObservationLog.map(item => {
      const viewLog: ViewObservationLogModel = { ...item };
      // Display the values in scaled form 
      if (this.scaleValue && viewLog.value && this.element.entryScaleFactor) {
        // To remove rounding errors number utils round off
        viewLog.value = FormEntryDefinition.getUnScaledValue(this.element, viewLog.value);
      }

      // Convert the entry date time to current local time
      viewLog.entryDateTime = DateUtils.getPresentableDatetime(viewLog.entryDateTime, this.cachedMetadataService.utcOffSet);
      return viewLog;
    }
    );
  }



  protected getSourceName(sourceId: number): string {
    return this.cachedMetadataService.getSource(sourceId).name;
  }


}
