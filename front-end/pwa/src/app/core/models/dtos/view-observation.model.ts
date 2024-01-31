export interface ViewObservationDto {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    level: string;
    datetime: string;
    period: number;
    value: number | null;
    flag: number | null;
    qcStatus: number;
    entryUserName: string;
    entryDateTime: string;
}