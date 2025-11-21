export interface EntryFormObservationQueryModel {
    stationId: string;
    elementIds: number[];
    interval: number;
    level: number;
    sourceId: number;
    fromDate: string;
    toDate: string;
}