export interface ViewObservationQueryModel {
    stationIds?: string[];
    sourceIds?: number[]; 
    elementIds?: number[];
    period?: number;
    useEntryDate?: boolean;
    fromDate?: string;
    toDate?: string;   
    page?: number;
    pageSize?: number;
}