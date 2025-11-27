import { IsEnum, IsInt } from 'class-validator';
import { QCTestParamConditionEnum } from './qc-test-param-condition.enum';

export class RelationalQCTestParamsDto {
    @IsInt()
    referenceElementId: number;

    @IsEnum(QCTestParamConditionEnum, { message: 'quality control parameter condition  must be a valid QCParameterConditionEnum value' })
    condition: QCTestParamConditionEnum;
    
}
