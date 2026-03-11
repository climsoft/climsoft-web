import { QCStatusEnum } from "./qc-status.enum";

export interface ViewObservationLogModel {
    value: number | null;
    flagId: number | null;
    qcStatus: QCStatusEnum;
    comment: string | null;
    deleted: boolean;
    entryUserName: string;
    entryUserEmail: string;
    entryDateTime: string;
}
