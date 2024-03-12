import { CreateObservationModel } from "./create-observation.model";
import { FlagEnum } from "./enums/flag.enum";
import { QCStatusEnum } from "./enums/qc-status.enum";

export interface ViewObservationModel extends  CreateObservationModel{
    qcStatus: QCStatusEnum; 
}