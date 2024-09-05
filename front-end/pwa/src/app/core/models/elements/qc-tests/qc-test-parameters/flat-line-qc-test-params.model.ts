import { QCTestParametersValidity } from "../create-qc-test.model";

export interface FlatLineQCTestParamsModel extends QCTestParametersValidity {
    consecutiveRecords: number;
    rangeThreshold: number;
}

