export interface ViewObservationDto {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    elevation: number;
    datetime: string;
    period: number;
    value: number | null;
    flag: number | null;
    qcStatus: number;
    entryUserName: string;
    entryDateTime: string;
}