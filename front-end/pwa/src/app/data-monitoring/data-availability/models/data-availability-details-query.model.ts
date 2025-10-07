export interface DataAvailabilityDetailsQueryModel {
    stationIds?: string[];
    elementIds?: number[];
    interval?: number;
    level?: number;
    fromDate: string;
    toDate: string;
}

