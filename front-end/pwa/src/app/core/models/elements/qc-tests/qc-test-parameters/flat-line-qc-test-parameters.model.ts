import { QCTestParametersValidity } from "../create-qc-test.model";

export interface FlatLineQCTestParametersModel extends QCTestParametersValidity {
    consecutiveRecords: number;
    range: number;
}

