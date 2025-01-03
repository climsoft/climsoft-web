import { QCTestParametersValidity } from "../create-element-qc-test.model";

export interface RangeThresholdQCTestParamsModel extends QCTestParametersValidity {
    lowerThreshold: number;
    upperThreshold: number;
}

