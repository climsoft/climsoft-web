export interface EntryFormObservationQueryModel {
    stationId: string;
    sourceId: number;
    level: number;  
    elementIds: number[];    
    fromDate: string;
    toDate: string;
}