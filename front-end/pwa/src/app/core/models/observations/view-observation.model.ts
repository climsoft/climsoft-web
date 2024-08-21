import { CreateObservationModel } from "./create-observation.model";
import { FlagEnum } from "./flag.enum";

export interface ViewObservationModel extends CreateObservationModel {
    stationName: string;
    elementAbbrv: string;
    sourceName: string;
    entryDatetime: string;
}