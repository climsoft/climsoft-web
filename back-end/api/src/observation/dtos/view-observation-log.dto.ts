import { FlagEnum } from "../enums/flag.enum";

export class ViewObservationLogDto {
    value: number | null;
    flag: FlagEnum | null; 
    comment: string | null;
    deleted: boolean;
    entryDateTime: string;
}