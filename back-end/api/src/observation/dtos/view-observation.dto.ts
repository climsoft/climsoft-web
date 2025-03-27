import { CreateObservationDto } from "./create-observation.dto";


export class ViewObservationDto extends CreateObservationDto {
    entryDatetime: string; 
}