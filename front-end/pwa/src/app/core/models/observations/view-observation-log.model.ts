import { FlagEnum } from "./flag.enum";

export interface ViewObservationLogModel {
    value: number | null;
    flag: FlagEnum | null;
    final: boolean;
    comment: string | null;
    deleted: boolean;
    entryDateTime: string;
}