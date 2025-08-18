import { IsInt, IsOptional } from "class-validator";
import { QCTestParametersValidity } from "../create-element-qc-test.dto";
import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";


export class ContextualQCTestParamsDto  implements QCTestParametersValidity {
    @IsInt()
    referenceElementId: number;
    
    @IsOptional() // TODO. Do validations. This should not be optional.
    referenceCheck: { condition: QCTestParamConditionEnum, value: number };

    @IsOptional() // TODO. Do validations. This should not be optional.
    primaryCheck: { condition: QCTestParamConditionEnum, value: number };

    isValid(): boolean {
        //TODO
        return true;
    }
}

