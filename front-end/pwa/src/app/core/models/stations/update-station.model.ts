import { StationObsProcessingMethodEnum } from "./station-obs-Processing-method.enum";
import { StationStatusEnum } from "./station-status.enum";
import { PointModel } from "../point.model";

export interface UpdateStationModel {
  name: string;
  description: string;
  longitude: number;
  latitude: number; 
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