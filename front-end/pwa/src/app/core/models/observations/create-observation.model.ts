import { FlagEnum } from "./flag.enum"; 

export interface CreateObservationModel {
    stationId: string;
    elementId: number;
    sourceId: number;
    level: number;
    datetime: string;
    period: number;
    value: number | null;
    flag: FlagEnum | null; 
    comment: string | null;
}