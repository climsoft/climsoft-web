import { ViewElementModel } from "src/app/core/models/elements/view-element.model";
import { CreateObservationModel } from "src/app/core/models/observations/create-observation.model";
import { FlagEnum } from "src/app/core/models/observations/flag.enum";

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


    public setValueFlag(value: number | null, flag: FlagEnum | null): void {
        this.observation.value = value;
        this.observation.flag = flag;
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


}