import { QCTestParametersValidity } from "../create-qc-test.model";
import { QCTestParamConditionEnum } from "./qc-test-parameter-condition.enum";

export interface ContextualQCTestParametersModel extends QCTestParametersValidity {
    referenceElementId: number;
    referenceCheck: { condition: QCTestParamConditionEnum, value: number };
    primaryCheck: { condition: QCTestParamConditionEnum, value: number };
}

