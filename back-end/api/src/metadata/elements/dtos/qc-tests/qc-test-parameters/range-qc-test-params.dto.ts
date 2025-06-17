import { IsNumber } from 'class-validator';
import { QCTestParametersValidity } from '../create-element-qc-test.dto';

export class RangeThresholdQCTestParamsDto implements QCTestParametersValidity {
    @IsNumber()
    lowerLimit: number;

    @IsNumber()
    upperLimit: number;

    isValid(): boolean {
        //TODO
        return true;
    }
}

