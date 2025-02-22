export interface EntryFormObservationQueryModel {
    stationId: string;
    sourceId: number;
    elevation: number;  
    elementIds: number[];   
    datetimes: string[]; 
}