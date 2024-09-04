import { QCTestParametersValidity } from "../create-qc-test.model";

export interface SpikeQCTestParametersModel extends QCTestParametersValidity {
    consecutiveRecords: number;
    difference: number;
}

