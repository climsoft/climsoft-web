import { IsInt, IsNumber, Min } from "class-validator";
import { QCTestParametersValidity } from "../create-element-qc-test.dto";


export class SpikeQCTestParamsDto implements QCTestParametersValidity {
    @IsInt()
    @Min(2, { message: 'consecutiveRecords must be at least 2' })
    consecutiveRecords: number;

    @IsNumber()
    spikeThreshold: number;

    isValid(): boolean {
        //TODO
        return true;
    }
}

