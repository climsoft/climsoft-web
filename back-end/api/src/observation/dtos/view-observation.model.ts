
import { QCTestLogVo } from "../entities/observation.entity";
import { QCStatusEnum } from "../enums/qc-status.enum";
import { ViewObservationLogDto } from "./view-observation-log.dto";

export interface ViewObservationModel {
    stationId: string;
    elementId: number;
    sourceId: number;
    level: number;
    datetime: string;
    interval: number;
    value: number | null;
    flagId: number | null;
    comment: string | null;
    qcStatus: QCStatusEnum;
    qcTestLog: QCTestLogVo[] | null;
    log: ViewObservationLogDto[];
    entryDatetime: string;
}