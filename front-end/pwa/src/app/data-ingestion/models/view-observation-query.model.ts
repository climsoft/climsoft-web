export interface ViewObservationQueryModel {
    stationIds?: string[];
    elementIds?: number[];
    intervals?: number[];
    level?: number;
    sourceIds?: number[]; 
    useEntryDate?: boolean;
    fromDate?: string;
    toDate?: string;  
    deleted: boolean; // Note, this is not optional.
    page?: number;
    pageSize?: number;
}