import { QCTestParametersValidity } from "../create-qc-test.model";
import { QCTestParamConditionEnum } from "./qc-test-parameter-condition.enum";

export interface RelationalQCTestParametersModel extends QCTestParametersValidity {
    referenceElementId: number;
    condition: QCTestParamConditionEnum;
}

