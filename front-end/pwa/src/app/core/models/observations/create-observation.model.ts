import { FlagEnum } from "./flag.enum"; 

export interface CreateObservationModel {
    stationId: string;
    elementId: number;
    sourceId: number;
    elevation: number;
    datetime: string;
    period: number;
    value: number | null;
    flag: FlagEnum | null; 
    comment: string | null;
}