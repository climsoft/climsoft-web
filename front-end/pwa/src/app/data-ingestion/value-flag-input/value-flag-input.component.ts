import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TextInputComponent } from 'src/app/shared/controls/text-input/text-input.component';
import { ViewObservationLogModel } from 'src/app/data-ingestion/models/view-observation-log.model';
import { ViewObservationModel, ViewQCTestLog } from 'src/app/data-ingestion/models/view-observation.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { RangeThresholdQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/range-qc-test-params.model';
import { QCTestTypeEnum } from 'src/app/metadata/qc-tests/models/qc-test-type.enum';
import { FormEntryDefinition } from 'src/app/data-ingestion/data-entry/form-entry/defintitions/form-entry.definition';
import { ObservationEntry } from '../models/observation-entry.model';
import { ElementCacheModel } from 'src/app/metadata/elements/services/elements-cache.service';
import { QCTestCacheModel } from 'src/app/metadata/qc-tests/services/qc-specifications-cache.service';
import { ViewFlagModel } from 'src/app/metadata/flags/models/view-flag.model';
import { DialogComponent } from 'src/app/shared/controls/dialog/dialog.component';

/**
 * Component for data entry of observations
 */

interface RangeThreshold {
  lowerThreshold: number;
  upperThreshold: number;
}

@Component({
  selector: 'app-value-flag-input',
  templateUrl: './value-flag-input.component.html',
  styleUrls: ['./value-flag-input.component.scss']
})
export class ValueFlagInputComponent implements OnChanges {
  @ViewChild('appVFTextInput') textInputComponent!: TextInputComponent;
  @ViewChild('dlgExtraInfo') dlgExtraInfo!: DialogComponent;

  @Input() public id!: string;

  @Input() public label!: string;

  @Input() public labelSuperScript!: string | undefined;

  @Input() public borderSize!: number;

  @Input() public observationEntry!: ObservationEntry;

  /**
 *  will be scaled or not. (by using the element entry factor).
 * Also determines whether value Flag displayed will be in scaled (e.g 10.5) or unscaled (e.g 105) format. 
 */

  /**
   * Determines whether element entry scale factor will be applied to the value input by user or not.
   * When true, 10.5 will be 105
   * When false 10.5 remain 10.5
   */
  @Input() public applyEntryScaleFactor: boolean = false;

  @Input() public displayExtraInfoOption: boolean = false;

  @Input() public disableValueFlagEntry: boolean = false;

  @Input() public simulateTabOnEnter: boolean = false;

  // Used by form entry to disable input of data when its already entered using a different source
  @Input() public duplicateObservations!: Map<string, ViewObservationModel>;

  @Output() public userInputVF = new EventEmitter<ObservationEntry>();

  @Output() public enterKeyPress = new EventEmitter<void>();

  protected activeTab: 'new' | 'history' | 'qctests' = 'new';
  protected duplicateObservation: ViewObservationModel | undefined;
  protected viewObservationLog!: ViewObservationLogModel[];
  protected duplicateObservationLog!: ViewObservationLogModel[];
  protected viewQCTestLog!: ViewQCTestLog[];
  protected comment: string = '';

  // Native HTML title shown on hover over the value/flag input.
  // Contains the user name, email and entry time of the latest log entry.
  protected titleTooltip: string = '';


  // Holds original value, flag and comment  values
  private originalValues: string = '';


  // Holds the validation error message when value flag is invalid.
  protected validationErrorMessage: string = '';

  // Holds the validation warning message when value flag is invalid.
  protected validationWarningMessage: string = '';

  protected valueFlagInput: string = '';
  private element!: ElementCacheModel;
  private rangeThresholdToUse: RangeThreshold | undefined;

  constructor(private cachedMetadataService: CachedMetadataService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observationEntry'] && this.observationEntry) {
      this.element = this.cachedMetadataService.getElement(this.observationEntry.observation.elementId);
      this.valueFlagInput = this.getValueFlagString(this.observationEntry.observation.value, this.observationEntry.observation.flagId);
      this.comment = this.observationEntry.observation.comment ? this.observationEntry.observation.comment : '';
      // set original database values for future comparison
      this.originalValues = `${this.valueFlagInput}-${this.comment}`;
      this.rangeThresholdToUse = this.getRangeThresholdToUse();

      // Format observation log once here so both the history tab and the hover
      // tooltip reuse the same formatted data.
      this.viewObservationLog = this.formatObservationLog(this.observationEntry.observation.log);
      this.titleTooltip = this.buildLastLogTitle(this.viewObservationLog);
    }

    if (changes['duplicateObservations'] && this.duplicateObservations && this.observationEntry) {
      this.duplicateObservation = this.duplicateObservations.get(`${this.observationEntry.observation.elementId}-${this.observationEntry.observation.datetime}`);
      if (this.duplicateObservation) {
        // If duplicate exist then disable entry.
        this.disableValueFlagEntry = true;

        // If there is a duplicate and the current entry has no log of its own,
        // hide the empty own log table under the history tab.
        if (this.observationEntry.observation.log.length === 0) {
          this.viewObservationLog = [];
        }

        // Precompute duplicate's log for the history tab.
        this.duplicateObservationLog = this.formatObservationLog(this.duplicateObservation.log);

        // If there is no value flag, e.g it's an attempt to enter a new record, then show the duplicate values
        if (this.valueFlagInput === '') {
          this.valueFlagInput = this.getValueFlagString(this.duplicateObservation.value, this.duplicateObservation.flagId);
          this.comment = this.duplicateObservation.comment ? this.duplicateObservation.comment : '';
        }
      }
    }

  }

  private formatObservationLog(viewObservationLog: ViewObservationLogModel[]): ViewObservationLogModel[] {
    // Transform the log data accordingly
    return viewObservationLog.map(item => {
      const viewLog: ViewObservationLogModel = { ...item };
      // Display the values in scaled form 
      if (this.applyEntryScaleFactor && viewLog.value && this.element.entryScaleFactor) {
        // To remove rounding errors number utils round off
        viewLog.value = FormEntryDefinition.getUnScaledValue(this.element, viewLog.value);
      }

      // Convert the entry date time to current local time
      viewLog.entryDateTime = DateUtils.getPresentableDatetime(viewLog.entryDateTime, this.cachedMetadataService.utcOffSet);
      return viewLog;
    }
    );
  }

  private buildLastLogTitle(log: ViewObservationLogModel[]): string {
    if (!log || log.length === 0) {
      return '';
    }
    const last = log[log.length - 1];
    return [last.entryUserName, last.entryUserEmail, last.entryDateTime].filter(p => p).join(' - ');
  }

  private getValueFlagString(value: number | null, flagId: number | null): string {
    let valueStr: string;
    const flagStr: string = flagId ? this.cachedMetadataService.getFlag(flagId).abbreviation : '';

    // If scaling is on and entry scale factor is >=10 then just add zero.
    if (value === null) {
      valueStr = '';
    } else if (this.applyEntryScaleFactor) {
      valueStr = FormEntryDefinition.getUnScaledValue(this.element, value).toString();

      if (this.element.entryScaleFactor === 10 && valueStr.length === 1) {
        valueStr = `0${valueStr}`;
      } else if (this.element.entryScaleFactor === 100) {
        if (valueStr.length === 1) {
          valueStr = `00${valueStr}`;
        } else if (valueStr.length === 2) {
          valueStr = `0${valueStr}`;
        }
      }
    } else {

      valueStr = value.toString();

      // For elements that have a scale factor then show the decimals for consistency.
      // For elements whose scale factor is 1, then no need to enforce showing of consistent decimals. This applies to elements like clouds and thunderstorms that are reported through codes like 1,2 etc
      if (this.element.entryScaleFactor > 1) {
        // Ensure values always show at least one decimal place, e.g. 0 -> 0.0, 20 -> 20.0, 25.5 -> 25.5
        if (!valueStr.includes('.')) {
          valueStr = `${valueStr}.0`;
        }
      }

    }

    return `${valueStr}${flagStr}`;
  }

  protected getFlagAbbreviation(flagId: number | null): string {
    if (!flagId) return '';
    return this.cachedMetadataService.getFlag(flagId).abbreviation;
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

    // If its a valid change the reformat the input appropriately
    if (this.observationEntry.change === 'valid_change') {
      this.valueFlagInput = this.getValueFlagString(this.observationEntry.observation.value, this.observationEntry.observation.flagId)
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
    this.dlgExtraInfo.openDialog();
  }

  protected onTabChange(selectedTab: 'new' | 'history' | 'qctests'): void {
    this.activeTab = selectedTab;
    // 'history' tab uses viewObservationLog / duplicateObservationLog that were
    // already precomputed in ngOnChanges, so nothing to do for it here.
    if (this.activeTab === 'qctests') {
      this.viewQCTestLog = [];
      if (this.observationEntry.observation.qcTestLog) {
        for (const obsQcTestLog of this.observationEntry.observation.qcTestLog) {
          const qcTestMetadata = this.cachedMetadataService.getQCTest(obsQcTestLog.qcTestId);
          this.viewQCTestLog.push({ id: obsQcTestLog.qcTestId, name: qcTestMetadata.name, qcStatus: obsQcTestLog.qcStatus })
        }
      }
    }
  }

  protected onExtraInfoOkClicked(): void {
    // If comment is changed then update the comment
    if (this.comment !== this.observationEntry.observation.comment) {
      this.validateAndUpdateValueFlagFromUserInput(this.valueFlagInput, this.comment);
      this.userInputVF.emit(this.observationEntry);
    }
  }

  protected getSourceName(sourceId: number): string {
    return this.cachedMetadataService.getSource(sourceId).name;
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
    const validatedInput = this.validateAndSeparate(newValueFlagInput);
    this.validationErrorMessage = validatedInput.errorMessage;
    if (this.validationErrorMessage !== '') {
      this.observationEntry.change = 'invalid_change';
      return;
    }

    // Extract and set the value and flag 

    let valueInput: number | null;
    if (this.applyEntryScaleFactor && validatedInput.value !== null) {
      valueInput = this.element.entryScaleFactor ? (validatedInput.value / this.element.entryScaleFactor) : validatedInput.value;
    } else {
      valueInput = validatedInput.value;
    }

    // If there is a value input then check if it's within the range thresholds
    if (valueInput !== null && this.rangeThresholdToUse) {
      // Get the scale factor to use. 
      // if no need to scale the value or the element does not have a scale factor. Just use 1 to show real threshold otherwise multiple by the scale factor
      const scaleFactor: number = this.applyEntryScaleFactor && this.element.entryScaleFactor ? this.element.entryScaleFactor : 1;

      if (valueInput < this.rangeThresholdToUse.lowerThreshold) {
        this.validationWarningMessage = `Value less than lower limit ${this.rangeThresholdToUse.lowerThreshold * scaleFactor}`;
      }

      if (valueInput > this.rangeThresholdToUse.upperThreshold) {
        this.validationWarningMessage = `Value higher than upper limit ${this.rangeThresholdToUse.upperThreshold * scaleFactor}`;
      }
    }

    // Set the value and flag to the observation model 
    this.observationEntry.observation.value = valueInput;
    this.observationEntry.observation.flagId = validatedInput.flag?.id ?? null;
    this.observationEntry.observation.comment = commentInput ?? this.observationEntry.observation.comment;

    this.valueFlagInput = newValueFlagInput;
    this.comment = this.observationEntry.observation.comment || '';

    if (`${this.valueFlagInput}-${this.comment}` === this.originalValues) {
      this.observationEntry.change = 'no_change';
    } else if (this.observationEntry.observation.value === null && this.observationEntry.observation.flagId === null) {
      this.validationErrorMessage = 'Value and flag cannot be both empty. To clear the field, clear the comment'
      this.observationEntry.change = 'invalid_change';
    } else {
      this.observationEntry.change = 'valid_change';
    }
  }

  private validateAndSeparate(input: string): { errorMessage: string, value: number | null, flag: ViewFlagModel | null } {
    const response: { errorMessage: string, value: number | null, flag: ViewFlagModel | null } = {
      errorMessage: '', value: null, flag: null
    };

    // Step 1.
    // Check if it matches a flag. This should be a first step because some flags can be numeric and also some flags don't need values
    const flagFound = this.cachedMetadataService.getFlagByAbbreviationOrName(input);
    if (flagFound) {
      response.flag = flagFound;
      response.value = null;
      return response;
    }

    if (this.applyEntryScaleFactor) {
      // This block us used by data entry forms which do not expect decimals

      // Step 2.
      // Check if it's a pure integer (no decimals). 
      if (/^\d+$/.test(input)) {
        response.flag = null;
        response.value = parseInt(input, 10);
        return response;
      }

      // Step 3.
      // Check if it starts with digits followed by alphanumeric/special chars. 
      // Values should strictly follow the number first then character format.
      const mixed = input.match(/^(\d+)([^0-9].*)$/);
      if (mixed) {
        const flagFound = this.cachedMetadataService.getFlagByAbbreviationOrName(mixed[2]);
        if (flagFound) {
          const isMissing = flagFound.name.toLowerCase() === 'missing';
          if (!this.cachedMetadataService.getSource(this.observationEntry.observation.sourceId).allowMissingValue && isMissing) {
            response.errorMessage = 'Missing value not allowed';
            return response;
          }

          if (isMissing) {
            response.errorMessage = 'Invalid Flag. Missing is used for missing observations ONLY e.g when no observation was made.';
            return response;
          }

          response.value = parseInt(mixed[1], 10);
          response.flag = flagFound;
          return response;
        } else {
          response.errorMessage = 'Invalid Flag';
          return response;
        }
      }
    } else {

      // This block is used by data correction and qc assessment. It accepts the value flag with decimals

      // Check if it starts with digits followed by alphanumeric/special chars. 
      // Values should strictly follow the number first then character format.
      const mixed: [number | null, string | null] = [null, null];
      const numberPatternRegExp: RegExp = /[+-]?\d+(\.\d+)?/;  // Regular expression to match numbers with optional decimal points.
      const matches: RegExpMatchArray | null = input.match(numberPatternRegExp);

      mixed[0] = matches ? Number(matches[0]) : null;
      mixed[1] = input.replace(numberPatternRegExp, '');
      if (StringUtils.isNullOrEmpty(mixed[1], true)) {
        mixed[1] = null;
      }

      // Check for valid flag if it exists
      let flagFound: ViewFlagModel | undefined = undefined;
      if (mixed[1]) {
        flagFound = this.cachedMetadataService.getFlagByAbbreviationOrName(mixed[1]);
        if (flagFound) {
          const isMissing = flagFound.name.toLowerCase() === 'missing';
          if (!this.cachedMetadataService.getSource(this.observationEntry.observation.sourceId).allowMissingValue && isMissing) {
            response.errorMessage = 'Missing value not allowed';
            return response;
          }

          if (isMissing) {
            response.errorMessage = 'Invalid Flag. Missing is used for missing observations ONLY e.g when no observation was made.';
            return response;
          }
        } else {
          response.errorMessage = 'Invalid Flag';
          return response;
        }
      }

      response.value = mixed[0];
      response.flag = flagFound ?? null;
      return response;
    }

    response.errorMessage = 'Incorrect input format not allowed';
    return response;
  }

  //-------------------------------------------------- 
  // Getting Range Thresholds To Use
  //-------------------------------------------------- 
  private getRangeThresholdToUse(): { lowerThreshold: number, upperThreshold: number } | undefined {
    // Get all applicable range thresholds for the observation entry
    const rangeThresholds = this.getRangeThresholds();

    // Then select the one to use based system priority of using the thresholds
    return rangeThresholds
      .map(threshold => ({
        priority: this.calculatePriority(threshold),
        thresholds: this.extractThresholds(threshold)
      }))
      .filter(item => item.thresholds !== undefined)
      .sort((a, b) => a.priority - b.priority)[0]?.thresholds;
  }

  private getRangeThresholds(): QCTestCacheModel[] {
    return this.cachedMetadataService.getQCTestsFor(
      this.observationEntry.observation.elementId,
      this.observationEntry.observation.level,
      this.observationEntry.observation.interval
    ).filter(item => item.qcTestType === QCTestTypeEnum.RANGE_THRESHOLD);
  }

  private calculatePriority(rangeThreshold: QCTestCacheModel): number {
    const params = rangeThreshold.parameters as RangeThresholdQCTestParamsModel;
    const isStationSpecific = params.stationIds?.includes(this.observationEntry.observation.stationId);
    const hasMonthThresholds = !!params.monthsThresholds;

    if (isStationSpecific && hasMonthThresholds) return 1;
    if (isStationSpecific) return 2;
    if (hasMonthThresholds) return 3;
    return 4;
  }

  private extractThresholds(rangeThreshold: QCTestCacheModel): { lowerThreshold: number, upperThreshold: number } | undefined {
    const params = rangeThreshold.parameters as RangeThresholdQCTestParamsModel;

    if (params.monthsThresholds) {
      const obsMonth = this.getObservationMonth();
      return params.monthsThresholds[obsMonth - 1];
    }

    return params.allRangeThreshold;
  }

  private getObservationMonth(): number {
    return Number(this.observationEntry.observation.datetime.split('-')[1]);
  }
  //-------------------------------------------------- 

}
