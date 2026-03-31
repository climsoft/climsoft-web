export interface BulkObservationFilter {
    stationIds?: string[];
    elementIds?: number[];
    level?: number;
    intervals?: number[];
    sourceIds?: number[];
    fromDate?: string;
    toDate?: string;
    hours?: number[];
    useEntryDate?: boolean;
}
