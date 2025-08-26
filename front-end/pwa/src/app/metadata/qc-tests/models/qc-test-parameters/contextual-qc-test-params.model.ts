import { QCTestParametersValidity } from "../create-qc-test.model";
import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";

export interface ContextualQCTestParamsModel extends QCTestParametersValidity {
    referenceElementId: number;
    referenceCheck: { condition: QCTestParamConditionEnum, value: number };
    primaryCheck: { condition: QCTestParamConditionEnum, value: number };
}

