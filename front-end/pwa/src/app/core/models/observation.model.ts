export interface ObservationModel {
    stationId: string;
    elementId: number;
    sourceId: number;
    elevation: number;
    datetime: string;
    period: number;
    value: number | null;
    flag: number | null; //todo. rename this to flag Id
    qcStatus: number;
    comment: string | null;
    entryUserId?: number;
    entryDateTime?: string;
    log: string | null; //json string
}