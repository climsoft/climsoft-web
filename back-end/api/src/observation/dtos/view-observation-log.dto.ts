import { QCStatusEnum } from "../enums/qc-status.enum";

export class ViewObservationLogDto {
  value: number | null;
  flagId: number | null;
  qcStatus: QCStatusEnum;
  comment: string | null;
  deleted: boolean;
  entryUserName: string;
  entryUserEmail: string;
  entryDateTime: string;
}
