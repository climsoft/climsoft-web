import { CreateObservationModel } from "./create-observation.model"; 

export interface ViewObservationModel extends CreateObservationModel {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    entryDatetime: string; 
}