import { QualityControlTestTypeEnum } from "./quality-control-test-type.enum";

export interface CreateQualityControlTestModel {
    qcTestTypeId: QualityControlTestTypeEnum;
    elementId: number;
    period: number | null;
    parameters: QCTestParametersValidity;
    realTime: boolean;
    disabled: boolean;
    comment: string | null;
}

export interface QCTestParametersValidity{
    isValid(): boolean;
  }