import { CreateObservationDto } from "./create-observation.dto";


export class ViewObservationDto extends CreateObservationDto {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    entryDatetime: string;
    final: boolean;
}