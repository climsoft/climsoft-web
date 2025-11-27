import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";

export interface RelationalQCTestParamsModel {
  condition: QCTestParamConditionEnum;
  referenceElementId: number;
}

