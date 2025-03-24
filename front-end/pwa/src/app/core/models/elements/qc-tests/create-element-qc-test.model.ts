import { QCTestTypeEnum } from "./qc-test-type.enum";

export interface CreateElementQCTestModel {
    name: string;
    description: string | null;
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