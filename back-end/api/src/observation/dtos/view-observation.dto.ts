import { FlagEnum } from "../enums/flag.enum";
import { QCStatusEnum } from "../enums/qc-status.enum";


export class ViewObservationDto {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    elevation: number;
    datetime: string;
    period: number;
    value: number | null;
    flag: FlagEnum | null;
    qcStatus: QCStatusEnum;
    entryUserName: string;
    entryDateTime: string;
}