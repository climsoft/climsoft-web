import { FlagEnum } from "./flag.enum";

export interface ViewObservationLogModel {
    value: number | null;
    flag: string| null;
    comment: string | null;
    deleted: boolean;
    entryUserEmail: string;
    entryDateTime: string; 
}