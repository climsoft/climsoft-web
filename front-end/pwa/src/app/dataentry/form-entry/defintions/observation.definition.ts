import { ViewElementModel } from "src/app/core/models/elements/view-element.model";
import { CreateObservationModel } from "src/app/core/models/observations/create-observation.model";

export class ObservationDefinition {

    public observation: CreateObservationModel; 
    public elementMetadata: ViewElementModel;


    constructor(observation: CreateObservationModel, elementMetadata: ViewElementModel) {
        this.observation = observation;
        this.elementMetadata = elementMetadata;
    }

    public get ValueFlagForDisplay(): string {
        if (this.observation.value === null && this.observation.flag === null) {
            return '';
        }

        const scaledValue: number| null = this.ScaledValue;
        const valueStr = scaledValue !== null ? scaledValue.toString() : '';
        const flagStr = this.observation.flag !== null ? this.observation.flag[0].toUpperCase() : '';

        return valueStr + flagStr;
    }

    public  get ScaledValue(): number | null {
        if(this.observation.value && this.elementMetadata.entryScaleFactor){
              // To remove rounding errors use Math.floor()
            return Math.floor(this.observation.value * this.elementMetadata.entryScaleFactor) ; 
        }
      
        return  this.observation.value;
      }

}