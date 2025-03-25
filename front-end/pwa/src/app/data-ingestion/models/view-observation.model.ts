import { CreateObservationModel } from "./create-observation.model"; 

export interface ViewObservationModel extends CreateObservationModel {
    entryDatetime: string; 
}