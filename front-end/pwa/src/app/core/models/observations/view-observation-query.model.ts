export interface ViewObservationQueryModel {
    stationIds?: string[];
    elementIds?: number[];
    period?: number;
    elevation?: number;
    sourceIds?: number[]; 
    useEntryDate?: boolean;
    fromDate?: string;
    toDate?: string;  
    deleted: boolean; // Note, this is not optional.
    page?: number;
    pageSize?: number;
}