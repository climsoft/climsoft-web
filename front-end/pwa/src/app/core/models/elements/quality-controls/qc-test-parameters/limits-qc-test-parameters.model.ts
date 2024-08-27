import { QCTestParametersValidity } from "../create-quality-control-test.model";

export interface LimitsQCTestParametersModel extends QCTestParametersValidity {
    lowerLimit: number;
    upperLimit: number;
}

