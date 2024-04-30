import { FlagEnum } from "./flag.enum";

export interface ViewObservationModel {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    elevation: number;
    datetime: string; 
    period: number;
    value: number | null;
    flag: FlagEnum | null;
}