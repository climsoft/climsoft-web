export interface ViewObservationQueryModel {
    stationIds?: string[];
    elementIds?: number[];
    period?: number;
    elevation?: number;
    sourceIds?: number[]; 
    useEntryDate?: boolean;
    fromDate?: string;
    toDate?: string;   
    page?: number;
    pageSize?: number;
}