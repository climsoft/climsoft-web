import { QCTestParametersValidity } from "../create-element-qc-test.model";
import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";

export interface RepeatedValueQCTestParamsModel extends QCTestParametersValidity {
    consecutiveRecords: number; // Number of consecutive records required for the test
    excludeRange?: { // Optional exclude range for values to be excluded from the test
        lowerThreshold: number, // Lower bound of the exclusion range
        upperThreshold: number  // Upper bound of the exclusion range
    }
}

