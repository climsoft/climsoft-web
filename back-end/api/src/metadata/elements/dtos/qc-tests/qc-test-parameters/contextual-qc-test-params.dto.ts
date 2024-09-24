import { IsInt } from "class-validator";
import { QCTestParametersValidity } from "../create-qc-test.dto";
import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";


export class ContextualQCTestParamsDto  implements QCTestParametersValidity {
    @IsInt()
    referenceElementId: number;
    // TODO. validations
    referenceCheck: { condition: QCTestParamConditionEnum, value: number };

    // TODO. Validations
    primaryCheck: { condition: QCTestParamConditionEnum, value: number };

    isValid(): boolean {
        //TODO
        return true;
    }
}

