export interface CreateObservationModel {
    stationId: string;
    elementId: number;
    sourceId: number;
    level: number;
    datetime: string;
    interval: number;
    value: number | null;
    flagId: number | null;
    comment: string | null;
}
