import { QCTestTypeEnum } from "src/app/metadata/qc-tests/models/qc-test-type.enum";

export interface FindQCTestQueryModel {
    qcTestTypes?: QCTestTypeEnum[];
    elementIds?: number[];
    observationInterval?: number; 
}