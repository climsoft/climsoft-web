export interface SelectObservation {
    stationId?: string;
    sourceId?: number; 
    elementId?: number;
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    period?: number;
    limit?: number;
    offset?: number;
}