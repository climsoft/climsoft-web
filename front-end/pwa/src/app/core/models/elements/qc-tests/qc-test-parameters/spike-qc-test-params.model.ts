import { QCTestParametersValidity } from "../create-qc-test.model";

export interface SpikeQCTestParamsModel extends QCTestParametersValidity {
    consecutiveRecords: number;
    spikeThreshold: number;
}

