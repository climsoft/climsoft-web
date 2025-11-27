import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";

export interface ContextualCheckModel { 
    condition: QCTestParamConditionEnum;

    value: number;
}

export interface ContextualQCTestParamsModel { 
    referenceElementId: number;
 
    primaryCheck: ContextualCheckModel;
 
    referenceCheck: ContextualCheckModel;

}
