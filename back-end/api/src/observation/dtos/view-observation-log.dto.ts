import { FlagEnum } from "../enums/flag.enum";

export class ViewObservationLogDto {
    value: number | null;
    flag: FlagEnum | null;
    final: boolean;
    comment: string | null;
    deleted: boolean;
    entryUserEmail: string | null;
    entryDateTime: string;
}