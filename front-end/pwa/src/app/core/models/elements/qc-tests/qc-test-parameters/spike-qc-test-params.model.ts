import { QCTestParametersValidity } from "../create-element-qc-test.model";

export interface SpikeQCTestParamsModel extends QCTestParametersValidity { 
    spikeThreshold: number;
}

