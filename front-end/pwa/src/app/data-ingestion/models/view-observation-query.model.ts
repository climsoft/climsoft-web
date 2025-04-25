export interface ViewObservationQueryModel {
    stationIds?: string[];
    elementIds?: number[];
    intervals?: number[];
    level?: number;
    sourceIds?: number[];
    useEntryDate?: boolean;
    fromDate?: string;
    toDate?: string;
    deleted?: boolean;
    page?: number;
    pageSize?: number;
}