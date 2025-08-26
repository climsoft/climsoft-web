import { QCTestParametersValidity } from "../create-qc-test.model";

export interface SpikeQCTestParamsModel extends QCTestParametersValidity { 
    spikeThreshold: number;
}

