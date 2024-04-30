export interface CreateObservationQueryModel {
    stationId: string;
    sourceId: number;
    elementIds: number[];
    period: number;
    datetimes: string[];
}