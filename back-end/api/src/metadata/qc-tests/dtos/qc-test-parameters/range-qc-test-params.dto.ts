import { IsNumber } from 'class-validator';
import { QCTestParametersValidity } from '../create-qc-test.dto';

export class RangeThresholdQCTestParamsDto implements QCTestParametersValidity {
    @IsNumber()
    lowerThreshold: number;

    @IsNumber()
    upperThreshold: number;

    isValid(): boolean {
        //TODO
        return true;
    }
}

