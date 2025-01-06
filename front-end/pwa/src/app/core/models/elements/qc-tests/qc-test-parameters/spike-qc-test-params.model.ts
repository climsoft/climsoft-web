import { QCTestParametersValidity } from "../create-element-qc-test.model";

export interface SpikeQCTestParamsModel extends QCTestParametersValidity {
    consecutiveRecords: number;
    spikeThreshold: number;
}

