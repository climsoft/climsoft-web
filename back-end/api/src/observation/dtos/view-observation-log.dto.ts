import { FlagEnum } from "../enums/flag.enum";
import { QCStatusEnum } from "../enums/qc-status.enum";

export class ViewObservationLogDto {
  value: number | null;
  flag: FlagEnum | null;
  qcStatus: QCStatusEnum;
  comment: string | null;
  deleted: boolean;
  entryUserName: string;
  entryUserEmail: string;
  entryDateTime: string;
}