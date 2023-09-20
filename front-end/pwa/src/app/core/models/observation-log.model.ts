
export interface ObservationLog {
    period: number;
    value: number | null;
    flag: number | null;
    qcStatus: number;
    entryUser: number  
    entryDateTime: string;
    comment: string;
}