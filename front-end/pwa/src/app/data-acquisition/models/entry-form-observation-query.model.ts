export interface EntryFormObservationQueryModel {
    stationId: string;
    sourceId: number;
    level: number;  
    elementIds: number[];   
    datetimes: string[]; 
}