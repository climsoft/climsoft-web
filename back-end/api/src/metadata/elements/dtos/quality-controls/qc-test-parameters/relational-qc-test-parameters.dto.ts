import { IsEnum, IsInt } from 'class-validator';
import { QCParameterConditionEnum } from './qc-test-parameter-condition.enum';
import { QCTestParametersValidity } from '../create-quality-control-test.dto';

export class RelationalQCTestParametersDto implements QCTestParametersValidity{
    @IsInt()
    referenceId: number;

    @IsEnum(QCParameterConditionEnum, { message: 'quality control parameter condition  must be a valid QCParameterConditionEnum value' })
    condition: QCParameterConditionEnum;
    
    isValid(): boolean {
        //TODO
        return true;
    }
}

