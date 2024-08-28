import { QCTestParametersValidity } from "../create-qc-test.model";
import { QCParameterConditionEnum } from "./qc-test-parameter-condition.enum";

export interface RelationalQCTestParametersModel extends QCTestParametersValidity {
    referenceId: number;
    condition: QCParameterConditionEnum;
}

