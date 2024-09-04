import { QCTestParametersValidity } from "../create-qc-test.model";

export interface RepeatedValueQCTestParametersModel extends QCTestParametersValidity {
    consecutiveRecords: number;
}

