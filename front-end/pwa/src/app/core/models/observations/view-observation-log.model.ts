import { FlagEnum } from "./flag.enum";

export interface ViewObservationLogModel {
    value: number | null;
    flag: FlagEnum | null; 
    comment: string | null;
    deleted: boolean;
    entryDateTime: string;
}