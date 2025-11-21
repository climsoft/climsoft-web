import { RangeThresholdQCTestParamsModel } from "src/app/metadata/qc-tests/models/qc-test-parameters/range-qc-test-params.model";
import { FlagEnum } from "src/app/data-ingestion/models/flag.enum";
import { ViewObservationLogModel } from "src/app/data-ingestion/models/view-observation-log.model";
import { DateUtils } from "src/app/shared/utils/date.utils";
import { NumberUtils } from "src/app/shared/utils/number.utils";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { CachedMetadataService } from "src/app/metadata/metadata-updates/cached-metadata.service";
import { QCTestTypeEnum } from "src/app/metadata/qc-tests/models/qc-test-type.enum";
import { ViewObservationModel, ViewQCTestLog } from "../../models/view-observation.model";

/**
 * Holds the definitions used by the value flag component for data display and entry validations
 */
export class ObservationDefinition {
    private _observation: ViewObservationModel;

    /**
     * holds original value, flag, period and comment  values
     */
    private _databaseValues: string = '';

    private _existsInDatabase: boolean = false;

    /**
     * Determines whether the value input will be scaled or not (using the element entry factor).
     * Also determines whether _valueFlagForDisplay will be ins scaled or unscaled format. 
     */
    public scaleValue: boolean;



    /**
     * Holds the validation error message when value flag is invalid. 
     */
    private _validationErrorMessage: string = "";

    /**
     * Holds the validation warning message when value flag is invalid.
     */
    private _validationWarningMessage: string = "";

    public valueFlagInput!: string; 


    private cachedMetadataSearchService: CachedMetadataService;

    constructor(
        newCachedMetadataSearchService: CachedMetadataService,
        observation: ViewObservationModel,
        scaleValue: boolean,) {
        this._observation = observation;
        this.cachedMetadataSearchService = newCachedMetadataSearchService;
        this.scaleValue = scaleValue; 
        this.valueFlagInput = this.constructValueFlagForDisplayStr(this.observation.value, this.observation.flag);

        this._existsInDatabase = observation.value !== null || observation.flag !== null;
        // set original database values for future comparison
        this._databaseValues = `${this.getvalueFlagForDisplay()}${this.comment}`;

    }


    public getvalueFlagForDisplay(): string {
        return this.constructValueFlagForDisplayStr(this.observation.value, this.observation.flag);;
    }

    public get observation(): ViewObservationModel {
        return this._observation;
    }



    public get validationErrorMessage(): string {
        return this._validationErrorMessage;
    }

    public get validationWarningMessage(): string {
        return this._validationWarningMessage;
    }

    public get observationChangeIsValid(): boolean {
        // There should be no validation error messages
        return this.validationErrorMessage.length === 0;
    }

    public get observationChanged(): boolean {
        return `${this.getvalueFlagForDisplay()}${this.comment}` !== this._databaseValues;
    }

    public get comment(): string | null {
        return this.observation.comment;
    }

    public get existsInDatabase(): boolean {
        return this._existsInDatabase;
    }

   

    /**
     * Checks validity of the value flag input and if valid sets it as the new value for observation value and flag.
     * Updates it's internal state depending on the validity of the value flag input
     * @param valueFlagInput  e.g '200', '200E', 'M', ''
     * @param enforceLimitCheck whether to enforce limit check or not
     * @returns empty string if value flag contents are valid, else returns the error message.
     */
    public updateValueFlagFromUserInput(newValueFlagInput: string, comment?: string): void {
        // Important, trim any white spaces (empty values will always be ignored)
        this.valueFlagInput = newValueFlagInput.trim();
        this._validationErrorMessage = "";
        this._validationWarningMessage = "";

        // Validate input format validity. If there is a response then entry is invalid
        this._validationErrorMessage = this.checkInputFormatValidity(this.valueFlagInput)
        if (!StringUtils.isNullOrEmpty(this._validationErrorMessage)) {
            return;
        }

        // Extract and set the value and flag
        const extractedScaledValFlag = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(this.valueFlagInput);

        // Transform the value to actual scale 
        const value: number | null = extractedScaledValFlag[0] === null ? null : this.getValueBasedOnScaleDefinition(extractedScaledValFlag[0]);

        // Transform the flag letter
        const flagLetter: string | null = extractedScaledValFlag[1] === null ? null : extractedScaledValFlag[1].toUpperCase();

        // If there is a value input then validate
        if (value !== null) {
            this._validationWarningMessage = this.checkValueLimitsValidity(value);
        }

        // If there is a flag input then validate
        if (flagLetter !== null) {
            this._validationErrorMessage = this.checkFlagLetterValidity(value, flagLetter);
            if (!StringUtils.isNullOrEmpty(this._validationErrorMessage)) {
                return;
            }
        }

        // Set the value and flag to the observation model 
        this.observation.value = value;
        this.observation.flag = flagLetter ? this.findFlag(flagLetter) : null;
        
        if(comment !== undefined){
            this.observation.comment = comment;
        }
    
    }

    private constructValueFlagForDisplayStr(value: number | null, flag: FlagEnum | null): string {
        const unScaledValue: number | null = this.scaleValue ? this.getUnScaledValue(value) : value;
        let valueStr = unScaledValue === null ? '' : unScaledValue.toString();
        const flagStr = flag === null ? '' : flag[0].toUpperCase();

        // If scaling is on and entry scale factor is >=10 then just add zero.
        // TODO this could be implemented later to factor when the scale is like 100
        if (this.scaleValue) {
            const element = this.cachedMetadataSearchService.getElement(this.observation.elementId);
            if (element.entryScaleFactor >= 10 && valueStr.length === 1) {
                valueStr = `0${valueStr}`;
            }
        }

        return valueStr + flagStr;
    }


    /**
     * Used internally to scale the value from the user input.
     * By default, values are asssumed to be unscaled when input by user, e.g 105 instead of 10.5, that's why this is is false.
     * @param value 
     * @returns 
     */
    private getValueBasedOnScaleDefinition(value: number): number {
        if (!this.scaleValue) {
            return value;
        }

        const element = this.cachedMetadataSearchService.getElement(this.observation.elementId);
        return element.entryScaleFactor ? value / element.entryScaleFactor : value;
    }

    public getUnScaledValue(value: number | null): number | null {
        // To remove rounding errors use number utils round off
        const element = this.cachedMetadataSearchService.getElement(this.observation.elementId);
        return value && element.entryScaleFactor ? NumberUtils.roundOff(value * element.entryScaleFactor, 4) : value;
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
        const rangeThresholds = this.cachedMetadataSearchService.getQCTestsFor(
            this.observation.elementId, this.observation.level, this.observation.interval)
            .filter(item => item.qcTestType === QCTestTypeEnum.RANGE_THRESHOLD);// 

        if (rangeThresholds.length === 0) {
            return '';
        }

        const rangeThreshold = rangeThresholds[0].parameters as RangeThresholdQCTestParamsModel;

        const element = this.cachedMetadataSearchService.getElement(this.observation.elementId);;
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

        if (!this.cachedMetadataSearchService.getSource(this.observation.sourceId).allowMissingValue && flagFound === FlagEnum.MISSING) {
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

  

    public getQCTestLog(): ViewQCTestLog[] {
        if (!this.observation.qcTestLog) {
            return [];
        }

        const viewQCLog: ViewQCTestLog[] = [];

        for (const obsQcTestLog of this.observation.qcTestLog) {
            const qcTestMetadata = this.cachedMetadataSearchService.getQCTest(obsQcTestLog.qcTestId);
            viewQCLog.push({ id: obsQcTestLog.qcTestId, name: qcTestMetadata.name, qcStatus: obsQcTestLog.qcStatus })
        }

        return viewQCLog;
    }

}