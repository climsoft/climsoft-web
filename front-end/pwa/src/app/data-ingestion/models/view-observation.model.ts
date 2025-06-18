import { CreateObservationModel } from "./create-observation.model";
import { QCStatusEnum } from "./qc-status.enum";

export interface QCTestLogDto {
    qcTestId: number;
    qcStatus: QCStatusEnum;
}

export interface ViewObservationModel extends CreateObservationModel {
    qcStatus: QCStatusEnum;
    qcTestLog: QCTestLogDto | null;
    entryDatetime: string;
    // TODO add entryLogDto 
}