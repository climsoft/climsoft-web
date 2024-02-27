import { Flag } from "../enums/flag.enum";
import { QCStatus } from "../enums/qc-status.enum";


export class ViewObservationDto {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    elevation: number;
    datetime: string;
    period: number;
    value: number | null;
    flag: Flag | null;
    qcStatus: QCStatus;
    entryUserName: string;
    entryDateTime: string;
}