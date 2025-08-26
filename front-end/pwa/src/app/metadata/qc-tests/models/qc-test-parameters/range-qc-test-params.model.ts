import { QCTestParametersValidity } from "../create-qc-test.model";

export interface RangeThresholdQCTestParamsModel extends QCTestParametersValidity {
    lowerThreshold: number;
    upperThreshold: number;
}

