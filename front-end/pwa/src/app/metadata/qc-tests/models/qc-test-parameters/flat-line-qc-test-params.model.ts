import { QCTestParametersValidity } from "../create-qc-test.model";

export interface FlatLineQCTestParamsModel extends QCTestParametersValidity {
    consecutiveRecords: number;
    flatLineThreshold: number;
    excludeRange?: { // Optional exclude range for values to be excluded from the test
        lowerThreshold: number, // Lower bound of the exclusion range
        upperThreshold: number  // Upper bound of the exclusion range
    }
}

