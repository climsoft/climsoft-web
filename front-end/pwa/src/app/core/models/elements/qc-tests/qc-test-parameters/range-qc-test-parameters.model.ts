import { QCTestParametersValidity } from "../create-qc-test.model";

export interface RangeThresholdQCTestParametersModel extends QCTestParametersValidity {
    lowerLimit: number;
    upperLimit: number;
}

