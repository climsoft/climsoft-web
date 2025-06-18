import { QCStatusEnum } from "../enums/qc-status.enum";
import { CreateObservationDto } from "./create-observation.dto";

export interface QCTestLogDto {
    qcTestId: number;
    qcStatus: QCStatusEnum;
}

export class ViewObservationDto extends CreateObservationDto {
    qcStatus: QCStatusEnum;
    qcTestLog: QCTestLogDto | null;
    entryDatetime: string;
    // TODO add entryLogDto 
}