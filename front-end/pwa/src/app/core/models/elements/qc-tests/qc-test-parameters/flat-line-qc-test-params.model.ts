import { QCTestParametersValidity } from "../create-element-qc-test.model";

export interface FlatLineQCTestParamsModel extends QCTestParametersValidity {
    consecutiveRecords: number;
    rangeThreshold: number;
}

