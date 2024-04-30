import { FlagEnum } from "../enums/flag.enum";


export class ViewObservationDto {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    elevation: number;
    datetime: string;
    period: number;
    value: number | null;
    flag: FlagEnum | null;
}