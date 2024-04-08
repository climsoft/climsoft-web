import { StationObsProcessingMethodEnum } from "./enums/station-obs-Processing-method.enum";
import { StationStatusEnum } from "./enums/station-status.enum";
import { PointModel } from "./point.model";

export interface CreateUpdateStationModel {
  id: string;
  name: string;
  description: string;
  location: PointModel ; 
  elevation: number ;
  stationObsProcessingMethod: StationObsProcessingMethodEnum ;
  stationObsEnvironmentId: number | null;
  stationObsFocusId: number | null; 
  wmoId: string | null; 
  wigosId: string | null; 
  icaoId: string | null;
  status: StationStatusEnum | null;
  dateEstablished: string | null;
  dateClosed: string | null;
  comment: string | null;
}