import { QCTestParametersValidity } from "../create-qc-test.model";

export interface RangeThresholdQCTestParamsModel extends QCTestParametersValidity {
    lowerLimit: number;
    upperLimit: number;
}

