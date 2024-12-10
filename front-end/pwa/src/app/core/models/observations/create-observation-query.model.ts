export interface CreateObservationQueryModel {
    stationId: string;
    elementIds: number[];
    sourceId: number;
    elevation: number;   
    datetimes: string[]; 
}