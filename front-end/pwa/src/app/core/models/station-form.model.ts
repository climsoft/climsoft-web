export interface StationFormModel {
    stationId: string;
    sourceId: number;
    sourceName: string;
    sourceDescription: string;
    comment: string | null;
    entryUser: string;
    entryDateTime: string;
    log: string | null;
}