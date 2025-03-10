import { QCTestTypeEnum } from "./qc-test-type.enum";

export interface CreateElementQCTestModel {
    qcTestType: QCTestTypeEnum;
    elementId: number;
    observationInterval: number;
    parameters: QCTestParametersValidity;
    disabled: boolean;
    comment: string | null;
}

export interface QCTestParametersValidity{
    isValid(): boolean;
  }