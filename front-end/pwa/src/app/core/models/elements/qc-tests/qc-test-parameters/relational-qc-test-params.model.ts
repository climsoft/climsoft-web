import { QCTestParametersValidity } from "../create-element-qc-test.model";
import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";

export interface RelationalQCTestParamsModel extends QCTestParametersValidity {
      condition: QCTestParamConditionEnum;
    referenceElementId: number;  
}

