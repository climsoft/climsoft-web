import { CreateObservationModel } from "./create-observation.model";
import { QCStatusEnum } from "./qc-status.enum";
import { ViewObservationLogModel } from "./view-observation-log.model";

export interface ViewObservationModel extends CreateObservationModel {
    qcStatus: QCStatusEnum;
    qcTestLog: {
        qcTestId: number;
        qcStatus: QCStatusEnum;
    }[] | null;
    log: ViewObservationLogModel[];
    entryDatetime: string;
}

export interface ViewQCTestLog {
    id: number;
    name: string,
    qcStatus: QCStatusEnum
}