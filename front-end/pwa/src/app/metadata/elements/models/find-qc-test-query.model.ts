import { QCTestTypeEnum } from "src/app/core/models/elements/qc-tests/qc-test-type.enum";

export interface FindQCTestQueryModel {
    qcTestTypes?: QCTestTypeEnum[];
    elementIds?: number[];
    observationPeriod?: number; 
}