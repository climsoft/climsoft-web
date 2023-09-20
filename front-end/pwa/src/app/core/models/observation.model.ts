export interface Observation {
    stationId: string;
    elementId: number;
    sourceId: number;
    level: string;
    datetime: string;
    period: number;
    value: number | null;
    flag: number | null; //todo. rename this to flag Id
    qcStatus: number;
    comment: string | null;
    entryUser?: number;
    entryDateTime?: string;
    log?: string | null; //json string
}