import { IsDecimal } from 'class-validator';
import { QCTestParametersValidity } from '../create-quality-control-test.dto';

export class LimitsQCTestParametersDto implements QCTestParametersValidity {
    @IsDecimal()
    lowerLimit: number;

    @IsDecimal()
    upperLimit: number;

    isValid(): boolean {
        //TODO
        return true;
    }
}

