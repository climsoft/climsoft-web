export interface SelectObservation {
    stationId?: string;
    sourceId?: number; 
    elementIds?: number[];
    year?: number;
    month?: number;
    day?: number;
    hours?: number[];
    period?: number;
    limit?: number;
    offset?: number;
}