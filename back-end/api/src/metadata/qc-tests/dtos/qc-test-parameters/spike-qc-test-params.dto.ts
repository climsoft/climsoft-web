import { IsNumber } from "class-validator";
import { QCTestParametersValidity } from "../create-qc-test.dto";


export class SpikeQCTestParamsDto implements QCTestParametersValidity {
    @IsNumber()
    spikeThreshold: number;

    isValid(): boolean {
        //TODO
        return true;
    }
}

