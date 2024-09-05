import { QCTestParametersValidity } from "../create-qc-test.model";

export interface RepeatedValueQCTestParamsModel extends QCTestParametersValidity {
    consecutiveRecords: number;
}

