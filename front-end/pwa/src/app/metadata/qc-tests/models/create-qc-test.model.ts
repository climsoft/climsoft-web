import { QCTestTypeEnum } from "./qc-test-type.enum";

export interface CreateQCTestModel {
    name: string;
    description: string | null;
    elementId: number;
    observationLevel: number;
    observationInterval: number;
    qcTestType: QCTestTypeEnum;
    parameters: QCTestParametersValidity;
    disabled: boolean;
    comment: string | null;
}

export interface QCTestParametersValidity {
    isValid(): boolean;
}