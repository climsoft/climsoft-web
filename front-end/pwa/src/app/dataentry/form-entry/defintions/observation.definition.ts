import { ViewElementModel } from "src/app/core/models/elements/view-element.model";
import { CreateObservationModel } from "src/app/core/models/observations/create-observation.model";
import { FlagEnum } from "src/app/core/models/observations/flag.enum";
import { StringUtils } from "src/app/shared/utils/string.utils";

/**
 * Holds the definitions used by the value flag component for data display and entry validations
 */
export class ObservationDefinition {
    public observation: CreateObservationModel;
    public elementMetadata: ViewElementModel;
    public observationChangeIsValid: boolean;

    public valueFlagForDisplay: string | null = null;

    constructor(observation: CreateObservationModel, elementMetadata: ViewElementModel) {
        this.observation = observation;
        this.elementMetadata = elementMetadata;
        this.observationChangeIsValid = false;

        this.setValueFlagForDisplay();
    }

    private setValueFlagForDisplay(): void {
        if (this.observation.value === null && this.observation.flag === null) {
            this.valueFlagForDisplay === null;
        }

        const scaledValue: number | null = this.getScaledValue();
        const valueStr = scaledValue !== null ? scaledValue.toString() : '';
        const flagStr = this.observation.flag !== null ? this.observation.flag[0].toUpperCase() : '';

        this.valueFlagForDisplay = valueStr + flagStr;
    }

    public getScaledValue(): number | null {
        if (this.observation.value && this.elementMetadata.entryScaleFactor) {
            // To remove rounding errors use Math.floor()
            return Math.floor(this.observation.value * this.elementMetadata.entryScaleFactor);
        }

        return this.observation.value;
    }


    /**
     * Checks validity of the value flag input and if valid sets it as the new value for observation value and flag.
     * Updates it's internal state depending on the validity of the value flag input
     * @param valueFlagInput  e.g '200', '200E', 'M', ''
     * @param enforceLimitCheck whether to enforce limit check or not
     * @returns empty string if value flag contents are valid, else returns the error message.
     */
    public setValueFlagFromInput(valueFlagInput: string, enforceLimitCheck: boolean): string {

        this.observationChangeIsValid = false;

        // Validate input format validity. If there is a response then entry is invalid
        let validationResponse = this.checkInputFormatValidity(valueFlagInput)
        if (!StringUtils.isNullOrEmpty(validationResponse)) {
            return validationResponse;
        }

        // Extract and set the value and flag
        const extractedScaledValFlag = StringUtils.splitNumbersAndTrailingNonNumericCharactersOnly(valueFlagInput);

        // Transform the value to actual scale 
        const value: number | null = extractedScaledValFlag[0] === null ? null : this.getUnScaledValue(extractedScaledValFlag[0]);

        // Transform the flag letter
        const flagLetter: string | null = extractedScaledValFlag[1] === null ? null : extractedScaledValFlag[1].toUpperCase();

        // If there is a value input then validate
        if (value !== null) {
            validationResponse = this.checkValueLimitsValidity(value);

            //If enforcement of limits is true and there is an error response then invalidate the observation
            if (enforceLimitCheck && !StringUtils.isNullOrEmpty(validationResponse)) {
                return validationResponse;
            }
        }

        // If there is a flag input then validate
        if (flagLetter !== null) {
            validationResponse = this.checkFlagLetterValidity(value, flagLetter);
            if (!StringUtils.isNullOrEmpty(validationResponse)) {
                return validationResponse;
            }
        }

        // Set the value and flag to the observation model 

        this.observation.value = value;
        this.observation.flag = flagLetter ? this.getFlag(flagLetter) : null;
        this.observationChangeIsValid = true;
        this.setValueFlagForDisplay();

        // Emit observation data change event
        return '';

    }


    /**
     * Validates a value flag input by checking on acceptible input formats
     * @param valueFlagInput 
     * @returns empty string if valid
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

    /**
     * Validates the value against the element limits
     * @param value Unscaled value
     * @returns empty string if value is valid.
     */
    private checkValueLimitsValidity(value: number): string {

        const element = this.elementMetadata;

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

    /**
     * Validates the flag letter. 
     * @param value 
     * @param flagLetter 
     * @returns empty string if valid
     */
    private checkFlagLetterValidity(value: number | null, flagLetter: string): string {

        if(flagLetter.length>1){
            return 'Invalid Flag, single letter expected';
        }

        const flagFound: FlagEnum | null = this.getFlag(flagLetter);

        if (!flagFound) {
            return 'Invalid Flag';
        }

        if (value !== null && flagFound === FlagEnum.MISSING) {
            return 'Invalid Flag, M is used for missing value ONLY';
        }

        return '';
    }

    private getUnScaledValue(scaledValue: number): number {
        const element = this.elementMetadata;
        return element.entryScaleFactor ? scaledValue / element.entryScaleFactor : scaledValue;
    }

    private getFlag(inputFlag: string): FlagEnum | null {
        return Object.values<FlagEnum>(FlagEnum).find(f => f[0].toLowerCase() === inputFlag[0].toLowerCase()) || null;
    }




}