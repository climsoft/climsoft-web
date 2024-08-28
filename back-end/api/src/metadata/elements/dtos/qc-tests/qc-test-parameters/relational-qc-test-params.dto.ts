import { IsEnum, IsInt } from 'class-validator';
import { QCParamConditionEnum } from './qc-test-param-condition.enum';
import { QCTestParametersValidity } from '../create-qc-test.dto';

export class RelationalQCTestParamsDto implements QCTestParametersValidity{
    @IsInt()
    referenceId: number;

    @IsEnum(QCParamConditionEnum, { message: 'quality control parameter condition  must be a valid QCParameterConditionEnum value' })
    condition: QCParamConditionEnum;
    
    isValid(): boolean {
        //TODO
        return true;
    }
}

