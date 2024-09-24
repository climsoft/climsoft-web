import { IsEnum, IsInt } from 'class-validator';
import { QCTestParamConditionEnum } from './qc-test-param-condition.enum';
import { QCTestParametersValidity } from '../create-qc-test.dto';

export class RelationalQCTestParamsDto implements QCTestParametersValidity{
    @IsInt()
    referenceElementId: number;

    @IsEnum(QCTestParamConditionEnum, { message: 'quality control parameter condition  must be a valid QCParameterConditionEnum value' })
    condition: QCTestParamConditionEnum;
    
    isValid(): boolean {
        //TODO
        return true;
    }
}

