import { FlagEnum } from "./flag.enum";
import { QCStatusEnum } from "./qc-status.enum";

export interface ViewObservationLogModel {
    value: number | null;
    flag: string| null;
    qcStatus: QCStatusEnum;
    comment: string | null;
    deleted: boolean;
    entryUserName: string;
    entryUserEmail: string;
    entryDateTime: string; 
}