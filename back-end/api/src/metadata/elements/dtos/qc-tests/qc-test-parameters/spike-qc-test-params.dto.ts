import { IsDecimal, IsInt } from "class-validator";
import { QCTestParametersValidity } from "../create-qc-test.dto";


export class SpikeQCTestParamsDto implements QCTestParametersValidity {
    @IsInt() // TODO. validate minimum of 2 only because "consecutive" implies at least two or more events or periods
    consecutiveRecords: number;

    @IsDecimal()
    spikeThreshold: number;

    isValid(): boolean {
        //TODO
        return true;
    }
}

