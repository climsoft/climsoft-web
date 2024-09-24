import { QCTestParametersValidity } from "../create-qc-test.model";
import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";

export interface RelationalQCTestParamsModel extends QCTestParametersValidity {
    referenceElementId: number;
    condition: QCTestParamConditionEnum;
}

